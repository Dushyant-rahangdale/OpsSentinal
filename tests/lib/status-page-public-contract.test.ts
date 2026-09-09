import { describe, expect, it } from 'vitest';
import { aggregatePublicRegions, buildPublicServiceHistory } from '@/lib/status-pages/history';
import { parsePublicStatusPageSnapshot } from '@/lib/status-pages/public-contract-schema';
import {
  getWorstPublicStatus,
  normalizePublicStatus,
  publicStatusForIncidentUrgency,
} from '@/lib/status-pages/status-presentation';

describe('canonical public status contract', () => {
  it('never converts malformed or missing status to operational', () => {
    expect(normalizePublicStatus(undefined)).toBe('UNKNOWN');
    expect(normalizePublicStatus('healthy')).toBe('UNKNOWN');
    expect(getWorstPublicStatus([])).toBe('UNKNOWN');
  });

  it('uses one precedence for service, region and history aggregation', () => {
    expect(getWorstPublicStatus(['OPERATIONAL', 'MAINTENANCE', 'DEGRADED'])).toBe('DEGRADED');
    expect(getWorstPublicStatus(['DEGRADED', 'MAJOR_OUTAGE'])).toBe('MAJOR_OUTAGE');
    expect(getWorstPublicStatus(['OPERATIONAL', 'UNKNOWN'])).toBe('UNKNOWN');
  });

  it('uses one monotonic urgency policy for current and historical status', () => {
    expect(publicStatusForIncidentUrgency('LOW')).toBe('DEGRADED');
    expect(publicStatusForIncidentUrgency('MEDIUM')).toBe('PARTIAL_OUTAGE');
    expect(publicStatusForIncidentUrgency('HIGH')).toBe('MAJOR_OUTAGE');
    expect(publicStatusForIncidentUrgency('UNRECOGNIZED')).toBe('UNKNOWN');
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
    expect(history.status).toBe('PARTIAL_OUTAGE');
    expect(history.incidentCount).toBe(1);
    expect(history.availabilityPercent).toBeLessThan(100);
    expect(history.timeline).toContainEqual({ startMinute: 735, endMinute: 805, status: 'PARTIAL_OUTAGE' });
  });

  it('uses half-open history ranges without a trailing midnight day', () => {
    const history = buildPublicServiceHistory({
      serviceId: 'api', incidents: [], maintenance: [], timezone: 'UTC',
      start: new Date('2026-09-09T00:00:00.000Z'),
      end: new Date('2026-09-10T00:00:00.000Z'),
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ date: '2026-09-09', status: 'OPERATIONAL' });
  });

  it('assigns incidents across midnight in the configured timezone', () => {
    const history = buildPublicServiceHistory({
      serviceId: 'api',
      incidents: [{
        serviceId: 'api', status: 'RESOLVED', urgency: 'LOW',
        createdAt: new Date('2026-09-09T06:30:00.000Z'),
        resolvedAt: new Date('2026-09-09T07:30:00.000Z'),
      }],
      maintenance: [],
      timezone: 'America/Los_Angeles',
      start: new Date('2026-09-09T06:00:00.000Z'),
      end: new Date('2026-09-09T08:00:00.000Z'),
    });
    expect(history.map(day => day.date)).toEqual(['2026-09-08', '2026-09-09']);
    expect(history[0]?.timeline).toContainEqual({ startMinute: 1410, endMinute: 1440, status: 'DEGRADED' });
    expect(history[1]?.timeline).toContainEqual({ startMinute: 0, endMinute: 30, status: 'DEGRADED' });
  });

  it('models the 25-hour daylight-saving fallback day without truncation', () => {
    const history = buildPublicServiceHistory({
      serviceId: 'api', incidents: [], maintenance: [], timezone: 'America/New_York',
      start: new Date('2026-11-01T04:00:00.000Z'),
      end: new Date('2026-11-02T05:00:00.000Z'),
    });
    expect(history).toHaveLength(1);
    expect(history[0]?.timeline).toEqual([{ startMinute: 0, endMinute: 1500, status: 'OPERATIONAL' }]);
  });

  it('preserves maintenance and aggregates multi-region services into each region', () => {
    const maintenance = buildPublicServiceHistory({
      serviceId: 'api', incidents: [],
      maintenance: [{ startDate: new Date('2026-09-09T01:00:00.000Z'), endDate: new Date('2026-09-09T02:00:00.000Z'), affectedServiceIds: ['api'] }],
      start: new Date('2026-09-09T00:00:00.000Z'), end: new Date('2026-09-10T00:00:00.000Z'),
    })[0];
    expect(maintenance.status).toBe('MAINTENANCE');
    expect(maintenance.availabilityPercent).toBe(100);
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
