import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { executeEscalation } from './notifications';
import { notifySlackForIncident } from './slack';
import { logger } from './logger';
import { EVENT_TRANSACTION_MAX_ATTEMPTS } from './config';

export type EventPayload = {
    event_action: 'trigger' | 'resolve' | 'acknowledge';
    dedup_key: string;
    payload: {
        summary: string;
        source: string;
        severity: 'critical' | 'error' | 'warning' | 'info';
        custom_details?: unknown;
    };
};

function isRetryableTransactionError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return error.code === 'P2034' || error.code === 'P2002';
    }
    const message = error instanceof Error ? error.message : '';
    return message.includes('Serialization') || message.includes('deadlock');
}

async function runSerializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const maxAttempts = EVENT_TRANSACTION_MAX_ATTEMPTS;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
            return (await prisma.$transaction(operation as any, { isolationLevel: 'Serializable' })) as T; // eslint-disable-line @typescript-eslint/no-explicit-any
        } catch (error) {
            if (attempt < maxAttempts - 1 && isRetryableTransactionError(error)) {
                continue;
            }
            throw error;
        }
    }
    throw new Error('Transaction failed after retries.');
}

export async function processEvent(payload: EventPayload, serviceId: string, _integrationId: string) {
    const { event_action, dedup_key, payload: eventData } = payload;

    const result = await runSerializableTransaction(async (tx) => {
        // 1. Log the raw alert
        const alert = await tx.alert.create({
            data: {
                dedupKey: dedup_key,
                status: event_action === 'resolve' ? 'RESOLVED' : 'TRIGGERED',
                payload: eventData as object,
                serviceId,
            }
        });

        // 2. Find existing open incident with this dedup_key
        const existingIncident = await tx.incident.findFirst({
            where: {
                dedupKey: dedup_key,
                serviceId,
                status: { not: 'RESOLVED' }
            }
        });

        if (event_action === 'trigger') {
            if (existingIncident) {
                // Deduplication: Just append the alert to the incident
                await tx.alert.update({
                    where: { id: alert.id },
                    data: { incidentId: existingIncident.id }
                });

                // Log an event instead of note (no userId needed)
                await tx.incidentEvent.create({
                    data: {
                        incidentId: existingIncident.id,
                        message: `Re-triggered by event from ${eventData.source}. Summary: ${eventData.summary}`
                    }
                });

                return { action: 'deduplicated', incident: existingIncident };
            }

            // Create New Incident
            const newIncident = await tx.incident.create({
                data: {
                    title: eventData.summary,
                    description: eventData.custom_details ? JSON.stringify(eventData.custom_details, null, 2) : null,
                    status: 'OPEN',
                    urgency: eventData.severity === 'critical' ? 'HIGH' : 'LOW',
                    dedupKey: dedup_key,
                    serviceId,
                }
            });

            // Connect alert to incident
            await tx.alert.update({
                where: { id: alert.id },
                data: { incidentId: newIncident.id }
            });

            // Log timeline event
            await tx.incidentEvent.create({
                data: {
                    incidentId: newIncident.id,
                    message: `Incident triggered via API from ${eventData.source}`
                }
            });

            // Note: Webhook triggering happens outside transaction to avoid blocking
            return { action: 'triggered', incident: newIncident };
        }

        if (event_action === 'resolve' && existingIncident) {
            await tx.alert.update({
                where: { id: alert.id },
                data: { incidentId: existingIncident.id }
            });

            const resolvedIncident = await tx.incident.update({
                where: { id: existingIncident.id },
                data: {
                    status: 'RESOLVED',
                    escalationStatus: 'COMPLETED',
                    nextEscalationAt: null,
                    resolvedAt: existingIncident.resolvedAt ?? new Date()
                }
            });

            await tx.incidentEvent.create({
                data: {
                    incidentId: existingIncident.id,
                    message: `Auto-resolved by event from ${eventData.source}.`
                }
            });

            return { action: 'resolved', incident: resolvedIncident };
        }

        if (event_action === 'acknowledge' && existingIncident) {
            await tx.alert.update({
                where: { id: alert.id },
                data: { incidentId: existingIncident.id }
            });

            const ackIncident = await tx.incident.update({
                where: { id: existingIncident.id },
                data: {
                    status: 'ACKNOWLEDGED',
                    escalationStatus: 'COMPLETED',
                    nextEscalationAt: null,
                    acknowledgedAt: existingIncident.acknowledgedAt ?? new Date()
                }
            });

            await tx.incidentEvent.create({
                data: {
                    incidentId: existingIncident.id,
                    message: `Acknowledged via API event.`
                }
            });

            return { action: 'acknowledged', incident: ackIncident };
        }

        return { action: 'ignored', reason: 'No matching incident to resolve/ack' };
    });

    if (result.action === 'triggered' && result.incident) {
        // Trigger status page webhooks for incident.created event
        try {
            const { triggerWebhooksForService } = await import('./status-page-webhooks');
            const incidentWithService = await prisma.incident.findUnique({
                where: { id: result.incident.id },
                include: {
                    service: { select: { id: true, name: true } },
                    assignee: { select: { id: true, name: true, email: true } },
                },
            });

            if (incidentWithService) {
                triggerWebhooksForService(
                    result.incident.serviceId,
                    'incident.created',
                    {
                        id: incidentWithService.id,
                        title: incidentWithService.title,
                        description: incidentWithService.description,
                        status: incidentWithService.status,
                        urgency: incidentWithService.urgency,
                        priority: incidentWithService.priority,
                        service: {
                            id: incidentWithService.service.id,
                            name: incidentWithService.service.name,
                        },
                        assignee: incidentWithService.assignee,
                        createdAt: incidentWithService.createdAt.toISOString(),
                    }
                ).catch((err) => {
                    logger.error('api.event.webhook_trigger_failed', {
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
            }
        } catch (e) {
            logger.error('api.event.webhook_trigger_error', {
                error: e instanceof Error ? e.message : String(e),
            });
        }

        // Send service-level notifications (to team members, assignee, etc.)
        // Uses user preferences for each recipient
        try {
            const { sendIncidentNotifications } = await import('./user-notifications');
            await sendIncidentNotifications(result.incident.id, 'triggered');
        } catch (error) {
            logger.error('Service notification failed', {
                incidentId: result.incident.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        // Execute escalation policy - send notifications via policy steps
        try {
            await executeEscalation(result.incident.id);
        } catch (error) {
            logger.error('Escalation failed', {
                incidentId: result.incident.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    if (result.action === 'resolved' && result.incident) {
        // Trigger status page webhooks for incident.resolved event
        try {
            const { triggerWebhooksForService } = await import('./status-page-webhooks');
            const incidentWithService = await prisma.incident.findUnique({
                where: { id: result.incident.id },
                include: {
                    service: { select: { id: true, name: true } },
                    assignee: { select: { id: true, name: true, email: true } },
                },
            });

            if (incidentWithService) {
                triggerWebhooksForService(
                    result.incident.serviceId,
                    'incident.resolved',
                    {
                        id: incidentWithService.id,
                        title: incidentWithService.title,
                        description: incidentWithService.description,
                        status: incidentWithService.status,
                        urgency: incidentWithService.urgency,
                        priority: incidentWithService.priority,
                        service: {
                            id: incidentWithService.service.id,
                            name: incidentWithService.service.name,
                        },
                        assignee: incidentWithService.assignee,
                        createdAt: incidentWithService.createdAt.toISOString(),
                        acknowledgedAt: incidentWithService.acknowledgedAt?.toISOString() || null,
                        resolvedAt: incidentWithService.resolvedAt?.toISOString() || null,
                    }
                ).catch((err) => {
                    logger.error('api.event.webhook_trigger_failed', {
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
            }
        } catch (e) {
            logger.error('api.event.webhook_trigger_error', {
                error: e instanceof Error ? e.message : String(e),
            });
        }

        notifySlackForIncident(result.incident.id, 'resolved').catch((error) => {
            logger.error('Slack notification failed', {
                incidentId: result.incident.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        });
    }

    if (result.action === 'acknowledged' && result.incident) {
        notifySlackForIncident(result.incident.id, 'acknowledged').catch((error) => {
            logger.error('Slack notification failed', {
                incidentId: result.incident.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        });
    }

    return result;
}
