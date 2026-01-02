import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { calculateSLAMetrics } from '@/lib/sla-server';

type PrismaMock = {
  incident: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  alert: {
    count: ReturnType<typeof vi.fn>;
  };
  onCallShift: {
    findMany: ReturnType<typeof vi.fn>;
  };
  onCallOverride: {
    count: ReturnType<typeof vi.fn>;
  };
  service: {
    findMany: ReturnType<typeof vi.fn>;
  };
  incidentEvent: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const prismaMock = prisma as unknown as PrismaMock & {
  alert?: PrismaMock['alert'];
  incident?: PrismaMock['incident'] & { groupBy?: ReturnType<typeof vi.fn> };
};

const setupBaseMocks = ({
  recentIncidents,
  previousIncidents,
  heatmapIncidents,
  escalationEvents,
  activeCount = 0,
  unassignedCount = 0,
}: {
  recentIncidents: Array<{
    id: string;
    createdAt: Date;
    updatedAt: Date | null;
    status: string;
    urgency: string;
    assigneeId: string | null;
    serviceId: string;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
    service: { targetAckMinutes: number; targetResolveMinutes: number };
  }>;
  previousIncidents: Array<{
    id: string;
    createdAt: Date;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
    urgency: string;
    status: string;
  }>;
  heatmapIncidents: Array<{ createdAt: Date }>;
  escalationEvents: Array<{ incidentId: string; createdAt: Date }>;
  activeCount?: number;
  unassignedCount?: number;
}) => {
  if (!prismaMock.alert) {
    prismaMock.alert = { count: vi.fn() };
  }
  if (!prismaMock.incident.groupBy) {
    prismaMock.incident.groupBy = vi.fn();
  }
  prismaMock.incident.count
    .mockResolvedValueOnce(activeCount)
    .mockResolvedValueOnce(unassignedCount);
  prismaMock.incident.findMany
    .mockResolvedValueOnce(recentIncidents)
    .mockResolvedValueOnce(previousIncidents)
    .mockResolvedValueOnce(heatmapIncidents);
  prismaMock.alert.count.mockResolvedValueOnce(0);
  prismaMock.onCallShift.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  prismaMock.onCallOverride.count.mockResolvedValueOnce(0);
  prismaMock.incident.groupBy
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  prismaMock.service.findMany.mockResolvedValueOnce([]);
  prismaMock.incidentEvent.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(escalationEvents)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
};

const toHourKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
};

describe('calculateSLAMetrics trend series', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds hourly trend series for a 1-day window with rate metrics', async () => {
    const recentIncidents = [
      {
        id: 'inc-1',
        createdAt: new Date('2026-01-01T01:00:00Z'),
        updatedAt: new Date('2026-01-01T02:00:00Z'),
        status: 'RESOLVED',
        urgency: 'HIGH',
        assigneeId: null,
        serviceId: 'service-1',
        acknowledgedAt: new Date('2026-01-01T01:10:00Z'),
        resolvedAt: new Date('2026-01-01T02:00:00Z'),
        service: { targetAckMinutes: 15, targetResolveMinutes: 120 },
      },
      {
        id: 'inc-2',
        createdAt: new Date('2026-01-01T05:00:00Z'),
        updatedAt: new Date('2026-01-01T05:30:00Z'),
        status: 'OPEN',
        urgency: 'LOW',
        assigneeId: null,
        serviceId: 'service-1',
        acknowledgedAt: new Date('2026-01-01T05:30:00Z'),
        resolvedAt: null,
        service: { targetAckMinutes: 15, targetResolveMinutes: 120 },
      },
    ];
    const escalationEvents = [{ incidentId: 'inc-2', createdAt: new Date('2026-01-01T05:15:00Z') }];

    setupBaseMocks({
      recentIncidents,
      previousIncidents: [],
      heatmapIncidents: [],
      escalationEvents,
      activeCount: 1,
      unassignedCount: 1,
    });

    const metrics = await calculateSLAMetrics({ windowDays: 1, userTimeZone: 'UTC' });

    expect(metrics.trendSeries).toHaveLength(24);

    const hourOneKey = toHourKey(new Date('2026-01-01T01:00:00Z'));
    const hourFiveKey = toHourKey(new Date('2026-01-01T05:00:00Z'));

    const hourOne = metrics.trendSeries.find(entry => entry.key === hourOneKey);
    const hourFive = metrics.trendSeries.find(entry => entry.key === hourFiveKey);

    expect(hourOne).toBeDefined();
    expect(hourFive).toBeDefined();

    expect(hourOne?.count).toBe(1);
    expect(hourOne?.ackRate).toBe(100);
    expect(hourOne?.resolveRate).toBe(100);
    expect(hourOne?.ackCompliance).toBe(100);
    expect(hourOne?.escalationRate).toBe(0);

    expect(hourFive?.count).toBe(1);
    expect(hourFive?.ackRate).toBe(100);
    expect(hourFive?.resolveRate).toBe(0);
    expect(hourFive?.ackCompliance).toBe(0);
    expect(hourFive?.escalationRate).toBe(100);
  });

  it('builds daily trend series for multi-day windows with new fields', async () => {
    setupBaseMocks({
      recentIncidents: [],
      previousIncidents: [],
      heatmapIncidents: [],
      escalationEvents: [],
    });

    const metrics = await calculateSLAMetrics({ windowDays: 7, userTimeZone: 'UTC' });

    expect(metrics.trendSeries).toHaveLength(7);
    metrics.trendSeries.forEach(entry => {
      expect(entry).toHaveProperty('ackRate');
      expect(entry).toHaveProperty('resolveRate');
      expect(entry).toHaveProperty('ackCompliance');
      expect(entry).toHaveProperty('escalationRate');
    });
  });
});
