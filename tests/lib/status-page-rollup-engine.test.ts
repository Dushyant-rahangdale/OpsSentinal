import { describe, expect, it } from 'vitest';
import {
  buildServiceHealthSegments,
  serviceUptimePercent,
  type PublicHistoryIncident,
} from '@/lib/status-pages/availability-engine';
import { rollupServiceDailyHealth, uptimeFromDailyHealth } from '@/lib/status-pages/rollup-engine';

const start = new Date('2026-09-01T00:00:00.000Z');
const end = new Date('2026-09-08T00:00:00.000Z'); // 7 UTC days

const incidents: PublicHistoryIncident[] = [
  {
    serviceId: 'api',
    status: 'RESOLVED',
    urgency: 'HIGH',
    createdAt: new Date('2026-09-02T10:00:00Z'),
    resolvedAt: new Date('2026-09-02T13:00:00Z'),
  },
  {
    serviceId: 'api',
    status: 'RESOLVED',
    urgency: 'LOW',
    createdAt: new Date('2026-09-04T22:00:00Z'),
    resolvedAt: new Date('2026-09-05T02:00:00Z'),
  },
];
const maintenance = [
  {
    startDate: new Date('2026-09-06T00:00:00Z'),
    endDate: new Date('2026-09-06T04:00:00Z'),
    affectedServiceIds: ['api'],
  },
];

describe('daily health rollups', () => {
  const segments = buildServiceHealthSegments({
    serviceId: 'api',
    incidents,
    maintenance,
    start,
    end,
  });
  const records = rollupServiceDailyHealth({ segments, incidents, start, end });

  it('produces one bucketed record per UTC day', () => {
    expect(records).toHaveLength(7);
    expect(records[0]?.date).toBe('2026-09-01');
    expect(records.at(-1)?.date).toBe('2026-09-07');
  });

  it('splits a midnight-spanning incident across both days', () => {
    expect(records.find(r => r.date === '2026-09-04')?.degradedMs).toBe(2 * 3_600_000); // 22:00ΓÇô24:00
    expect(records.find(r => r.date === '2026-09-05')?.degradedMs).toBe(2 * 3_600_000); // 00:00ΓÇô02:00
  });

  it('records maintenance as its own bucket, not downtime', () => {
    const day = records.find(r => r.date === '2026-09-06');
    expect(day?.maintenanceMs).toBe(4 * 3_600_000);
    expect(day?.degradedMs).toBe(0);
  });

  it('reads back the same uptime the live engine computes over the window', () => {
    expect(uptimeFromDailyHealth(records)).toBeCloseTo(
      serviceUptimePercent(segments, start, end),
      6
    );
  });

  it('never lets a full, incident-free day drop below operational', () => {
    const quiet = records.find(r => r.date === '2026-09-01');
    expect(quiet?.operationalMs).toBe(24 * 3_600_000);
  });
});
