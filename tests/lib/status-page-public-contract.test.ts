import { describe, expect, it } from 'vitest';
import { aggregatePublicRegions, buildPublicServiceHistory } from '@/lib/status-pages/history';
import { parsePublicStatusPageSnapshot } from '@/lib/status-pages/public-contract-schema';
import { getWorstPublicStatus, normalizePublicStatus } from '@/lib/status-pages/status-presentation';

describe('canonical public status contract', () => {
  it('never converts malformed or missing status to operational', () => {
    expect(normalizePublicStatus(undefined)).toBe('UNKNOWN');
    expect(normalizePublicStatus('healthy')).toBe('UNKNOWN');
    expect(getWorstPublicStatus([])).toBe('UNKNOWN');
  });

  it('uses one precedence for service, region and history aggregation', () => {
    expect(getWorstPublicStatus(['OPERATIONAL', 'MAINTENANCE', 'DEGRADED'])).toBe('DEGRADED');
    expect(getWorstPublicStatus(['DEGRADED', 'MAJOR_OUTAGE'])).toBe('MAJOR_OUTAGE');
  });

  it('keeps degraded history, timeline and availability semantically aligned', () => {
    const history = buildPublicServiceHistory({
      serviceId: 'payments',
      incidents: [{
        serviceId: 'payments', status: 'RESOLVED', urgency: 'MEDIUM',
        createdAt: new Date('2026-09-09T12:15:00.000Z'),
        resolvedAt: new Date('2026-09-09T13:25:00.000Z'),
      }],
      maintenance: [],
      start: new Date('2026-09-09T00:00:00.000Z'),
      end: new Date('2026-09-10T00:00:00.000Z'),
    })[0];
    expect(history.status).toBe('DEGRADED');
    expect(history.incidentCount).toBe(1);
    expect(history.availabilityPercent).toBeLessThan(100);
    expect(history.timeline).toContainEqual({ startMinute: 735, endMinute: 805, status: 'DEGRADED' });
  });

  it('preserves maintenance and aggregates multi-region services into each region', () => {
    const maintenance = buildPublicServiceHistory({
      serviceId: 'api', incidents: [],
      maintenance: [{ startDate: new Date('2026-09-09T01:00:00.000Z'), endDate: new Date('2026-09-09T02:00:00.000Z'), affectedServiceIds: ['api'] }],
      start: new Date('2026-09-09T00:00:00.000Z'), end: new Date('2026-09-10T00:00:00.000Z'),
    })[0];
    expect(maintenance.status).toBe('MAINTENANCE');
    const regions = aggregatePublicRegions([
      { id: 'api', regions: ['us-east-1', 'eu-west-1'], status: 'DEGRADED' },
      { id: 'web', regions: ['us-east-1'], status: 'OPERATIONAL' },
    ]);
    expect(regions).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'eu-west-1', status: 'DEGRADED', totalServices: 1 }),
      expect.objectContaining({ name: 'us-east-1', status: 'DEGRADED', totalServices: 2, impactedServices: 1 }),
    ]));
  });

  it('rejects malformed and legacy snapshots instead of serving false green', () => {
    expect(parsePublicStatusPageSnapshot('page', { schemaVersion: 3, pageId: 'page' })).toBeNull();
    expect(parsePublicStatusPageSnapshot('page', { schemaVersion: 2, pageId: 'page', status: 'operational' })).toBeNull();
  });
});
