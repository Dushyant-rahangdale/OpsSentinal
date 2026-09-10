import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetDatabase,
  createTestStatusPage,
  createTestService,
  createTestIncident,
  linkServiceToStatusPage,
} from '../helpers/test-db';
import { buildStatusPageSnapshot } from '@/lib/status-pages/snapshot';
import { buildPreviewSnapshot } from '@/lib/status-pages/preview-snapshot';
import {
  legacyPublicStatus,
  publicStatusForIncidentUrgency,
} from '@/lib/status-pages/status-presentation';

vi.mock('@/lib/sla-server', () => ({
  calculateMultiServiceUptime: vi.fn().mockResolvedValue({}),
}));

/**
 * One incident, asserted to mean the same thing everywhere it is reported.
 *
 * The failure this guards against is drift: a severity computed one way for the HTML page, another
 * for the JSON API, and a third in the admin preview, so the same incident reads as "degraded" in
 * one place and "outage" in another. Every surface must resolve to the same value from the same
 * projection.
 */
const URGENCY_EXPECTATIONS = [
  { urgency: 'LOW', expected: 'DEGRADED', legacy: 'degraded' },
  { urgency: 'MEDIUM', expected: 'PARTIAL_OUTAGE', legacy: 'outage' },
  { urgency: 'HIGH', expected: 'MAJOR_OUTAGE', legacy: 'outage' },
] as const;

describe('cross-surface status semantics', () => {
  beforeEach(resetDatabase);

  it.each(URGENCY_EXPECTATIONS)(
    'a $urgency incident is $expected on every surface',
    async ({ urgency, expected, legacy }) => {
      const service = await createTestService('Checkout API');
      const page = await createTestStatusPage({
        enabled: true,
        showServices: true,
        showIncidents: true,
        showServiceRegions: true,
      });
      await linkServiceToStatusPage(page.id, service.id);
      await createTestIncident('Elevated errors', service.id, {
        visibility: 'PUBLIC',
        urgency,
      });

      const published = await buildStatusPageSnapshot(page.id, '1');
      expect(published).not.toBeNull();
      const snapshot = published!;

      // The projection itself.
      expect(snapshot.services[0].status).toBe(expected);
      expect(snapshot.status).toBe(expected);
      // The overall summary, which reports severity separately from confidence.
      expect(snapshot.overall.status).toBe(expected);
      // Region aggregation, computed server-side from the same service statuses.
      expect(snapshot.regions.every(region => region.status === expected)).toBe(true);
      // The vocabulary older API consumers still read.
      expect(legacyPublicStatus(snapshot.status)).toBe(legacy);
      // The single policy every surface calls, rather than each mapping urgency itself.
      expect(publicStatusForIncidentUrgency(urgency)).toBe(expected);

      // The admin preview, projected from the same rules rather than approximating them.
      const preview = buildPreviewSnapshot({
        pageId: page.id,
        services: [{ id: service.id, name: service.name, region: service.region }],
        mappings: [{ serviceId: service.id, showOnPage: true }],
        incidents: [
          {
            id: 'incident-1',
            title: 'Elevated errors',
            status: 'OPEN',
            urgency,
            createdAt: new Date(),
            service: { id: service.id, name: service.name },
          },
        ],
        announcements: [],
        uptime90: {},
        privacy: null,
        showServices: true,
        showIncidents: true,
        thresholds: { uptimeExcellent: 99.9, uptimeGood: 99 },
      });
      expect(preview.services[0].status).toBe(expected);
      expect(preview.overall.status).toBe(expected);
      expect(preview.status).toBe(expected);
    }
  );

  it('reports a resolved incident as operational everywhere', async () => {
    const service = await createTestService('Checkout API');
    const page = await createTestStatusPage({
      enabled: true,
      showServices: true,
      showIncidents: true,
    });
    await linkServiceToStatusPage(page.id, service.id);
    await createTestIncident('Recovered', service.id, {
      visibility: 'PUBLIC',
      urgency: 'HIGH',
      status: 'RESOLVED',
      resolvedAt: new Date(),
    });

    const snapshot = (await buildStatusPageSnapshot(page.id, '1'))!;
    expect(snapshot.services[0].status).toBe('OPERATIONAL');
    expect(snapshot.overall.status).toBe('OPERATIONAL');
    expect(snapshot.services[0].activeIncidentCount).toBe(0);
    expect(legacyPublicStatus(snapshot.status)).toBe('operational');
  });

  it('lets the worst active incident decide a service, not the most recent', async () => {
    const service = await createTestService('Checkout API');
    const page = await createTestStatusPage({
      enabled: true,
      showServices: true,
      showIncidents: true,
    });
    await linkServiceToStatusPage(page.id, service.id);
    await createTestIncident('Major disruption', service.id, {
      visibility: 'PUBLIC',
      urgency: 'HIGH',
    });
    await createTestIncident('Minor blip', service.id, {
      visibility: 'PUBLIC',
      urgency: 'LOW',
    });

    const snapshot = (await buildStatusPageSnapshot(page.id, '1'))!;
    expect(snapshot.services[0].status).toBe('MAJOR_OUTAGE');
    expect(snapshot.services[0].activeIncidentCount).toBe(2);
  });
});
