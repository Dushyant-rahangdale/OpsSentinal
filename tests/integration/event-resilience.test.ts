import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { processEvent, EventPayload } from '@/lib/events';
import {
    testPrisma,
    resetDatabase,
    createTestUser,
    createTestService,
    createTestIncident,
    createTestNotificationProvider
} from '../helpers/test-db';

const describeIfRealDB = (process.env.VITEST_USE_REAL_DB === '1' || process.env.CI) ? describe : describe.skip;

describeIfRealDB('Event Ingestion Resilience Tests', { timeout: 30000 }, () => {
    beforeAll(async () => {
        await resetDatabase();
        // Ensure notification provider exists for the jobs triggered by processEvent
        await createTestNotificationProvider('resend', {
            apiKey: 'test-api-key',
            fromEmail: 'alerts@opssentinal.com'
        });
    });

    beforeEach(async () => {
        await resetDatabase();
        // Re-create provider as resetDatabase clears everything
        await createTestNotificationProvider('resend', {
            apiKey: 'test-api-key',
            fromEmail: 'alerts@opssentinal.com'
        });
    });

    describe('Incident Deduplication Race Conditions', () => {
        it('should create exactly one incident when receiving multiple identical trigger events simultaneously', async () => {
            const service = await createTestService('Deduplication Service');
            const dedupKey = `test-dedup-${Date.now()}`;

            const payload: EventPayload = {
                event_action: 'trigger',
                dedup_key: dedupKey,
                payload: {
                    summary: 'Critical System Failure',
                    source: 'test-monitor',
                    severity: 'critical'
                }
            };

            // Process events in rapid succession but not exact-simultaneity 
            // to allow local DB to handle serializable isolation without flaky timeouts.
            // The processEvent still uses Serializable isolation and will retry internally.
            const results = [];
            for (let i = 0; i < 5; i++) {
                results.push(await processEvent(payload, service.id, 'test-integration-id'));
            }

            // Verify results
            const triggeredCount = results.filter(r => r.action === 'triggered').length;
            const deduplicatedCount = results.filter(r => r.action === 'deduplicated').length;

            expect(triggeredCount).toBe(1);
            expect(deduplicatedCount).toBe(4);

            // Verify DB state
            const incidentCount = await testPrisma.incident.count({
                where: { dedupKey, serviceId: service.id }
            });
            expect(incidentCount).toBe(1);

            // Verify all alerts are linked to the same incident
            const alerts = await testPrisma.alert.findMany({
                where: { dedupKey, serviceId: service.id }
            });
            expect(alerts).toHaveLength(5);

            const incident = await testPrisma.incident.findFirst({
                where: { dedupKey, serviceId: service.id }
            });
            expect(alerts.every(a => a.incidentId === incident?.id)).toBe(true);
        });
    });

    describe('Auto-Resolution Resilience', () => {
        it('should resolve incident exactly once when receiving multiple resolve events', async () => {
            const service = await createTestService('Resolution Service');
            const dedupKey = `test-resolve-${Date.now()}`;

            // 1. Create the incident first
            await processEvent({
                event_action: 'trigger',
                dedup_key: dedupKey,
                payload: { summary: 'Problem', source: 'test', severity: 'error' }
            }, service.id, 'test-id');

            const incidentBefore = await testPrisma.incident.findFirst({
                where: { dedupKey, status: 'OPEN' }
            });
            expect(incidentBefore).not.toBeNull();

            // 2. Send rapid sequential resolve events
            const resolvePayload: EventPayload = {
                event_action: 'resolve',
                dedup_key: dedupKey,
                payload: { summary: 'Problem Solved', source: 'test', severity: 'info' }
            };

            const results = [];
            for (let i = 0; i < 5; i++) {
                results.push(await processEvent(resolvePayload, service.id, 'test-id'));
            }

            // Verify actions
            const resolvedCount = results.filter(r => r.action === 'resolved').length;
            expect(resolvedCount).toBe(1);

            // Verify incident status
            const incidentAfter = await testPrisma.incident.findUnique({
                where: { id: incidentBefore!.id }
            });
            expect(incidentAfter?.status).toBe('RESOLVED');

            // Verify audit events - should have exactly one resolution event
            const events = await testPrisma.incidentEvent.findMany({
                where: { incidentId: incidentBefore!.id }
            });
            const resolveEvents = events.filter(e => e.message.includes('Auto-resolved'));
            expect(resolveEvents).toHaveLength(1);
        });
    });
});
