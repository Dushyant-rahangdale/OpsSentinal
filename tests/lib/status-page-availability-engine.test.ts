import { describe, expect, it } from 'vitest';
import {
  buildServiceHealthSegments,
  clipHealthSegments,
  healthSegmentsToPublic,
  serviceUptimePercent,
} from '@/lib/status-pages/availability-engine';

const start = new Date('2026-09-09T00:00:00.000Z');
const end = new Date('2026-09-10T00:00:00.000Z'); // 24h window

describe('canonical availability engine', () => {
  it('derives uptime from the same segments that drive history', () => {
    const segments = buildServiceHealthSegments({
      serviceId: 'api',
      incidents: [
        {
          serviceId: 'api',
          status: 'RESOLVED',
          urgency: 'HIGH',
          createdAt: new Date('2026-09-09T01:00:00Z'),
          resolvedAt: new Date('2026-09-09T02:00:00Z'),
        },
      ],
      maintenance: [],
      start,
      end,
    });
    expect(healthSegmentsToPublic(segments)).toEqual([
      {
        startAt: '2026-09-09T01:00:00.000Z',
        endAt: '2026-09-09T02:00:00.000Z',
        status: 'MAJOR_OUTAGE',
      },
    ]);
    // 1h down out of 24h ΓçÆ 95.833%, computed from the identical interval set.
    expect(serviceUptimePercent(segments, start, end)).toBeCloseTo((23 / 24) * 100, 5);
  });

  it('treats maintenance as availability, not downtime', () => {
    const segments = buildServiceHealthSegments({
      serviceId: 'api',
      incidents: [],
      maintenance: [
        {
          startDate: new Date('2026-09-09T03:00:00Z'),
          endDate: new Date('2026-09-09T05:00:00Z'),
          affectedServiceIds: ['api'],
        },
      ],
      start,
      end,
    });
    expect(healthSegmentsToPublic(segments)).toEqual([
      {
        startAt: '2026-09-09T03:00:00.000Z',
        endAt: '2026-09-09T05:00:00.000Z',
        status: 'MAINTENANCE',
      },
    ]);
    expect(serviceUptimePercent(segments, start, end)).toBe(100);
  });

  it('lets an incident outrank overlapping maintenance in both history and uptime', () => {
    const segments = buildServiceHealthSegments({
      serviceId: 'api',
      incidents: [
        {
          serviceId: 'api',
          status: 'OPEN',
          urgency: 'MEDIUM',
          createdAt: new Date('2026-09-09T04:00:00Z'),
          resolvedAt: new Date('2026-09-09T04:30:00Z'),
        },
      ],
      maintenance: [
        {
          startDate: new Date('2026-09-09T03:00:00Z'),
          endDate: new Date('2026-09-09T05:00:00Z'),
          affectedServiceIds: ['api'],
        },
      ],
      start,
      end,
    });
    expect(healthSegmentsToPublic(segments)).toEqual([
      {
        startAt: '2026-09-09T03:00:00.000Z',
        endAt: '2026-09-09T04:00:00.000Z',
        status: 'MAINTENANCE',
      },
      {
        startAt: '2026-09-09T04:00:00.000Z',
        endAt: '2026-09-09T04:30:00.000Z',
        status: 'PARTIAL_OUTAGE',
      },
      {
        startAt: '2026-09-09T04:30:00.000Z',
        endAt: '2026-09-09T05:00:00.000Z',
        status: 'MAINTENANCE',
      },
    ]);
    // Only the 30-minute partial outage is downtime; maintenance stays available.
    expect(serviceUptimePercent(segments, start, end)).toBeCloseTo((1 - 0.5 / 24) * 100, 5);
  });

  it('clips wide segments to a sub-window without re-resolving status', () => {
    const wide = buildServiceHealthSegments({
      serviceId: 'api',
      incidents: [
        {
          serviceId: 'api',
          status: 'RESOLVED',
          urgency: 'LOW',
          createdAt: new Date('2026-09-08T23:00:00Z'),
          resolvedAt: new Date('2026-09-09T01:00:00Z'),
        },
      ],
      maintenance: [],
      start: new Date('2026-09-08T00:00:00Z'),
      end,
    });
    expect(healthSegmentsToPublic(clipHealthSegments(wide, start, end))).toEqual([
      {
        startAt: '2026-09-09T00:00:00.000Z',
        endAt: '2026-09-09T01:00:00.000Z',
        status: 'DEGRADED',
      },
    ]);
  });
});
