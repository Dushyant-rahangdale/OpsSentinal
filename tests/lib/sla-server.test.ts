import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { calculateSLAMetrics } from '@/lib/sla-server';
import { clearRetentionPolicyCache } from '@/lib/retention-policy';

// Local mock for this test file to ensure isolation
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    incident: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    alert: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    incidentNote: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    onCallShift: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    onCallOverride: {
      count: vi.fn().mockResolvedValue(0),
    },
    service: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    incidentEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    systemSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    sLADefinition: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

type PrismaMock = {
  incident: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  alert: {
    count: ReturnType<typeof vi.fn>;
    groupBy?: ReturnType<typeof vi.fn>;
  };
  incidentNote: {
    groupBy: ReturnType<typeof vi.fn>;
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
  $executeRaw: ReturnType<typeof vi.fn>;
  $queryRaw: ReturnType<typeof vi.fn>;
  systemSettings: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  sLADefinition: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const prismaMock = prisma as unknown as PrismaMock & {
  alert?: PrismaMock['alert'];
  incident?: PrismaMock['incident'] & { groupBy?: ReturnType<typeof vi.fn> };
  incidentNote?: PrismaMock['incidentNote'];
  $queryRaw: ReturnType<typeof vi.fn>;
  systemSettings?: PrismaMock['systemSettings'];
  sLADefinition?: PrismaMock['sLADefinition'];
};

// Initialize the new mock functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$executeRaw = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$queryRaw = vi.fn();

const setupBaseMocks = ({
  activeIncidents,
  recentIncidents,
  previousIncidents,
  heatmapIncidents,
  escalationEvents,
  resolved24hCount = 0,
}: {
  activeIncidents: Array<{
    id: string;
    status: string;
    urgency: string;
    assigneeId: string | null;
    serviceId: string;
  }>;
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
  resolved24hCount?: number;
}) => {
  if (!prismaMock.alert) {
    prismaMock.alert = { count: vi.fn() };
  }
  if (!prismaMock.alert.groupBy) {
    prismaMock.alert.groupBy = vi.fn();
  }
  if (!prismaMock.incidentNote) {
    prismaMock.incidentNote = { groupBy: vi.fn() };
  }
  if (!prismaMock.incident.groupBy) {
    prismaMock.incident.groupBy = vi.fn();
  }
  if (!prismaMock.sLADefinition) {
    prismaMock.sLADefinition = { findMany: vi.fn() };
  }
  // systemSettings is now in the global mock - just call mockResolvedValue
  prismaMock.systemSettings.findUnique.mockResolvedValue({
    incidentRetentionDays: 30,
    alertRetentionDays: 30,
    logRetentionDays: 30,
    metricsRetentionDays: 30,
    realTimeWindowDays: 30,
  });
  prismaMock.systemSettings.upsert.mockResolvedValue({
    incidentRetentionDays: 30,
    alertRetentionDays: 30,
    logRetentionDays: 30,
    metricsRetentionDays: 30,
    realTimeWindowDays: 30,
  });
  prismaMock.incident.count.mockResolvedValueOnce(resolved24hCount);
  prismaMock.incident.findMany
    .mockResolvedValueOnce(activeIncidents)
    .mockResolvedValueOnce(heatmapIncidents)
    .mockResolvedValueOnce(recentIncidents)
    .mockResolvedValueOnce(previousIncidents);
  prismaMock.alert.count.mockResolvedValueOnce(0);
  prismaMock.alert.groupBy.mockResolvedValueOnce([]);
  prismaMock.incidentNote.groupBy.mockResolvedValueOnce([]);
  prismaMock.onCallShift.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  prismaMock.onCallOverride.count.mockResolvedValueOnce(0);
  prismaMock.incident.groupBy
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  prismaMock.service.findMany.mockResolvedValueOnce([]);
  prismaMock.incidentEvent.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(escalationEvents)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  prismaMock.$executeRaw.mockResolvedValue(0);
  prismaMock.$queryRaw.mockResolvedValue([]);
  prismaMock.sLADefinition.findMany.mockResolvedValue([]);
};

const toHourKey = (date: Date) => {
  const dayKey = date.toISOString().split('T')[0];
  const hour = `${date.getUTCHours()}`.padStart(2, '0');
  return `${dayKey}-${hour}`;
};

describe('calculateSLAMetrics trend series', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    clearRetentionPolicyCache();
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
      activeIncidents: [
        {
          id: 'inc-2',
          status: 'OPEN',
          urgency: 'LOW',
          assigneeId: null,
          serviceId: 'service-1',
        },
      ],
      recentIncidents,
      previousIncidents: [],
      heatmapIncidents: [],
      escalationEvents,
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
      activeIncidents: [],
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

describe('calculateSLAMetrics retention metadata', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    clearRetentionPolicyCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clips requested window to retention policy and exposes metadata', async () => {
    setupBaseMocks({
      activeIncidents: [],
      recentIncidents: [],
      previousIncidents: [],
      heatmapIncidents: [],
      escalationEvents: [],
    });

    prismaMock.systemSettings.findUnique.mockResolvedValue({
      incidentRetentionDays: 1,
      alertRetentionDays: 1,
      logRetentionDays: 1,
      metricsRetentionDays: 1,
      realTimeWindowDays: 1,
    });

    const metrics = await calculateSLAMetrics({ windowDays: 7, userTimeZone: 'UTC' });

    expect(metrics.isClipped).toBe(true);
    expect(metrics.retentionDays).toBe(1);
    expect(metrics.requestedStart.toISOString().startsWith('2025-12-26')).toBe(true);
    expect(metrics.effectiveStart.toISOString().startsWith('2026-01-01')).toBe(true);
  });
});

describe('calculateSLAMetrics investigation metrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    clearRetentionPolicyCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes MTTI and MTTK from first notes and alerts', async () => {
    const recentIncidents = [
      {
        id: 'inc-1',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: new Date('2026-01-01T10:45:00Z'),
        status: 'OPEN',
        urgency: 'LOW',
        assigneeId: null,
        serviceId: 'service-1',
        acknowledgedAt: null,
        resolvedAt: null,
        service: { targetAckMinutes: 15, targetResolveMinutes: 120 },
      },
      {
        id: 'inc-2',
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:20:00Z'),
        status: 'OPEN',
        urgency: 'LOW',
        assigneeId: null,
        serviceId: 'service-1',
        acknowledgedAt: null,
        resolvedAt: null,
        service: { targetAckMinutes: 15, targetResolveMinutes: 120 },
      },
    ];

    setupBaseMocks({
      activeIncidents: [],
      recentIncidents,
      previousIncidents: [],
      heatmapIncidents: [],
      escalationEvents: [],
    });

    prismaMock.incidentNote?.groupBy.mockReset().mockResolvedValueOnce([
      { incidentId: 'inc-1', _min: { createdAt: new Date('2026-01-01T10:30:00Z') } },
      { incidentId: 'inc-2', _min: { createdAt: new Date('2026-01-01T12:10:00Z') } },
    ]);
    prismaMock.alert?.groupBy?.mockReset().mockResolvedValueOnce([
      { incidentId: 'inc-1', _min: { createdAt: new Date('2026-01-01T09:45:00Z') } },
      { incidentId: 'inc-2', _min: { createdAt: new Date('2026-01-01T11:50:00Z') } },
    ]);

    const metrics = await calculateSLAMetrics({ windowDays: 1, userTimeZone: 'UTC' });

    expect(metrics.mtti).toBeCloseTo(20, 2);
    expect(metrics.mttk).toBeCloseTo(12.5, 2);
  });
});
