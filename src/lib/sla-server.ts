import 'server-only';
import type { SLAMetrics } from './sla';
import { Prisma } from '@prisma/client';
import { formatDateTime } from './timezone';
import {
  buildOnCallLoad,
  buildServiceSlaTable,
  buildStatusAges,
  calculateMtbfMs,
  calculatePercentile,
} from './analytics-metrics';
import { getServiceDynamicStatus } from './service-status';
import { logger } from './logger';

/**
 * Extended SLA Metrics Filter
 * Supports all legacy analytics filters
 */
type SLAMetricsFilter = {
  serviceId?: string | string[];
  teamId?: string | string[];
  assigneeId?: string | null;
  urgency?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'OPEN' | 'ACKNOWLEDGED' | 'SNOOZED' | 'SUPPRESSED' | 'RESOLVED';
  startDate?: Date;
  endDate?: Date;
  windowDays?: number;
  includeAllTime?: boolean;
  userTimeZone?: string;
  useOrScope?: boolean;
  includeIncidents?: boolean;
  incidentLimit?: number;
};

const allowedStatus = ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED', 'RESOLVED'] as const;

type IncidentSLAResult = {
  ackSLA: {
    breached: boolean;
    timeRemaining: number | null;
    targetMinutes: number;
  };
  resolveSLA: {
    breached: boolean;
    timeRemaining: number | null;
    targetMinutes: number;
  };
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function startOfHour(date: Date) {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  return next;
}

function toHourKey(date: Date) {
  const dayKey = toDateKey(date);
  const hour = `${date.getUTCHours()}`.padStart(2, '0');
  return `${dayKey}-${hour}`;
}

function formatDayLabel(date: Date, timeZone: string = 'UTC') {
  return formatDateTime(date, timeZone, { format: 'short' });
}

function formatHourLabel(date: Date, timeZone: string = 'UTC') {
  return formatDateTime(date, timeZone, { format: 'time' });
}

function isAfterHours(date: Date) {
  const day = date.getDay();
  const hour = date.getHours();
  const isWeekend = day === 0 || day === 6;
  const isBusinessHours = hour >= 8 && hour < 18;
  return isWeekend || !isBusinessHours;
}

/**
 * Calculate SLA metrics with all filters & legacy parity
 */
export async function calculateSLAMetrics(filters: SLAMetricsFilter = {}): Promise<SLAMetrics> {
  const { default: prisma } = await import('./prisma');

  // 1. Determine Time Window
  const now = new Date();
  const windowDays = filters.windowDays || 7;
  const coverageWindowDays = 14;

  let start = filters.startDate;
  const end = filters.endDate || now;

  if (!start) {
    if (filters.includeAllTime) {
      start = new Date();
      start.setFullYear(start.getFullYear() - 1);
    } else {
      start = new Date(now);
      start.setDate(now.getDate() - windowDays);
    }
  }

  const coverageWindowEnd = new Date(now);
  coverageWindowEnd.setDate(now.getDate() + coverageWindowDays);

  const userTimeZone = filters.userTimeZone || 'UTC';

  // 2. Build Where Clauses
  const serviceWhere = filters.serviceId
    ? {
        serviceId: Array.isArray(filters.serviceId) ? { in: filters.serviceId } : filters.serviceId,
      }
    : {};

  const teamWhere = filters.teamId
    ? filters.useOrScope
      ? {
          OR: [
            { teamId: Array.isArray(filters.teamId) ? { in: filters.teamId } : filters.teamId },
            {
              service: {
                teamId: Array.isArray(filters.teamId) ? { in: filters.teamId } : filters.teamId,
              },
            },
          ],
        }
      : { teamId: Array.isArray(filters.teamId) ? { in: filters.teamId } : filters.teamId }
    : {};

  const assigneeWhere = filters.assigneeId ? { assigneeId: filters.assigneeId } : null;
  const statusWhere = filters.status ? { status: filters.status } : null;
  const urgencyWhere = filters.urgency ? { urgency: filters.urgency } : null;

  const activeStatusWhere = filters.status
    ? { status: filters.status }
    : { status: { not: 'RESOLVED' as const } };

  let activeWhere: Prisma.IncidentWhereInput = {
    ...activeStatusWhere,
    ...(urgencyWhere ?? {}),
  };

  const hasServiceFilter = Object.keys(serviceWhere).length > 0;
  const hasTeamFilter = Object.keys(teamWhere).length > 0;

  if (filters.useOrScope && (hasServiceFilter || hasTeamFilter || assigneeWhere)) {
    activeWhere.OR = [
      ...(hasServiceFilter ? [serviceWhere] : []),
      ...(hasTeamFilter ? [{ service: teamWhere }] : []),
      ...(assigneeWhere ? [assigneeWhere] : []),
    ];
  } else {
    activeWhere = {
      ...activeWhere,
      ...(hasServiceFilter ? serviceWhere : {}),
      ...(hasTeamFilter ? { service: teamWhere } : {}),
      ...(assigneeWhere ?? {}),
    };
  }

  const recentIncidentWhere: Prisma.IncidentWhereInput = {
    createdAt: { gte: start, lte: end },
    ...(urgencyWhere ?? {}),
    ...(statusWhere ?? {}),
  };

  if (filters.useOrScope && (hasServiceFilter || hasTeamFilter || assigneeWhere)) {
    recentIncidentWhere.OR = [
      ...(hasServiceFilter ? [serviceWhere] : []),
      ...(hasTeamFilter ? [{ service: teamWhere }] : []),
      ...(assigneeWhere ? [assigneeWhere] : []),
    ];
  } else {
    Object.assign(recentIncidentWhere, {
      ...(hasServiceFilter ? serviceWhere : {}),
      ...(hasTeamFilter ? { service: teamWhere } : {}),
      ...(assigneeWhere ?? {}),
    });
  }

  // Heatmap query (always last 365 days regardless of window)
  const heatmapStart = new Date(now);
  heatmapStart.setDate(now.getDate() - 365);
  const heatmapWhere: Prisma.IncidentWhereInput = {
    ...recentIncidentWhere,
    createdAt: { gte: heatmapStart, lte: now }, // Always up to NOW
  };

  // Previous Period Query (for Trends/Insights)
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - windowDays);
  const previousEnd = new Date(start);
  const previousWhere: Prisma.IncidentWhereInput = {
    ...recentIncidentWhere,
    createdAt: { gte: previousStart, lt: previousEnd },
  };

  // 3. Parallel Data Fetching
  const [
    activeIncidentsData,
    alertsCount,
    futureShifts,
    windowShifts,
    activeOverrides,
    statusTrends,
    services,
    assigneeCounts,
    recurringTitleCounts,
    heatmapIncidents,
    urgencyCounts,
    currentShiftsData,
    resolved24hCount,
    recentIncidents,
    previousIncidents,
  ] = await Promise.all([
    // Active breakdown (Status, Urgency, Assignment) - Batch fetch
    prisma.incident.findMany({
      where: activeWhere,
      select: { id: true, status: true, urgency: true, assigneeId: true, serviceId: true },
    }),
    prisma.alert.count({
      where: {
        createdAt: { gte: start },
        ...(Object.keys(serviceWhere).length > 0 ? serviceWhere : {}),
      },
    }),
    prisma.onCallShift.findMany({
      where: { end: { gte: now }, start: { lte: coverageWindowEnd } },
      select: { start: true, end: true, userId: true },
    }),
    prisma.onCallShift.findMany({
      where: { end: { gte: start }, start: { lte: end } },
      select: { start: true, end: true, userId: true },
    }),
    prisma.onCallOverride.count({ where: { end: { gte: now } } }),
    prisma.incident.groupBy({
      by: ['status'],
      where: recentIncidentWhere,
      _count: { _all: true },
    }),
    prisma.service.findMany({
      where: filters.serviceId
        ? { id: Array.isArray(filters.serviceId) ? { in: filters.serviceId } : filters.serviceId }
        : {},
      select: { id: true, name: true },
    }),
    prisma.incident.groupBy({
      by: ['assigneeId'],
      where: { ...recentIncidentWhere, assigneeId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 6,
    }),
    prisma.incident.groupBy({
      by: ['title'],
      where: recentIncidentWhere,
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.incident.findMany({
      where: heatmapWhere,
      select: { createdAt: true },
    }),
    prisma.incident.groupBy({
      by: ['urgency'],
      where: recentIncidentWhere,
      _count: { _all: true },
    }),
    // On-Call Widget
    prisma.onCallShift.findMany({
      where: { start: { lte: now }, end: { gte: now } },
      include: {
        user: { select: { name: true } },
        schedule: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.incident.count({
      where: {
        ...(Object.keys(serviceWhere).length > 0 ? serviceWhere : {}),
        ...(Object.keys(teamWhere).length > 0 ? { service: teamWhere } : {}),
        ...(assigneeWhere ?? {}),
        status: 'RESOLVED',
        resolvedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    // Fetch Recent/Previous separately as they are large and use more fields
    prisma.incident.findMany({
      where: recentIncidentWhere,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        urgency: true,
        assigneeId: true,
        serviceId: true,
        description: true,
        acknowledgedAt: true,
        resolvedAt: true,
        service: {
          select: {
            id: true,
            name: true,
            region: true,
            targetAckMinutes: true,
            targetResolveMinutes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.incidentLimit || 50,
    }),
    prisma.incident.findMany({
      where: previousWhere,
      select: {
        id: true,
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true,
        urgency: true,
        status: true,
      },
    }),
  ]);

  // DERIVE active metrics from the single batch fetch
  const activeIncidents = activeIncidentsData.length;
  const unassignedActive = activeIncidentsData.filter(i => !i.assigneeId).length;
  const criticalActiveIncidents = activeIncidentsData.filter(i => i.urgency === 'HIGH').length;

  const activeStatusCountMap = new Map<string, number>();
  activeIncidentsData.forEach(i => {
    activeStatusCountMap.set(i.status, (activeStatusCountMap.get(i.status) || 0) + 1);
  });

  const activeStatusBreakdown = Array.from(activeStatusCountMap.entries()).map(
    ([status, count]) => ({
      status,
      _count: { _all: count },
    })
  );

  const serviceActiveCountMap = new Map<string, number>();
  const serviceCriticalCountMap = new Map<string, number>();
  activeIncidentsData.forEach(i => {
    serviceActiveCountMap.set(i.serviceId, (serviceActiveCountMap.get(i.serviceId) || 0) + 1);
    if (i.urgency === 'HIGH') {
      serviceCriticalCountMap.set(i.serviceId, (serviceCriticalCountMap.get(i.serviceId) || 0) + 1);
    }
  });

  const serviceActiveCounts = Array.from(serviceActiveCountMap.entries()).map(
    ([serviceId, count]) => ({
      serviceId,
      _count: { _all: count },
    })
  );
  const serviceCriticalCounts = Array.from(serviceCriticalCountMap.entries()).map(
    ([serviceId, count]) => ({
      serviceId,
      _count: { _all: count },
    })
  );

  // 4. Fetch Incident Events
  const recentIncidentIds = recentIncidents.map(i => i.id);
  const [ackEvents, escalationEvents, reopenEvents, autoResolveEvents] = recentIncidentIds.length
    ? await Promise.all([
        prisma.incidentEvent.findMany({
          where: {
            incidentId: { in: recentIncidentIds },
            message: { contains: 'acknowledged', mode: 'insensitive' },
          },
          select: { incidentId: true, createdAt: true },
        }),
        prisma.incidentEvent.findMany({
          where: {
            incidentId: { in: recentIncidentIds },
            message: { contains: 'escalated to', mode: 'insensitive' },
          },
          select: { incidentId: true, createdAt: true },
        }),
        prisma.incidentEvent.findMany({
          where: {
            incidentId: { in: recentIncidentIds },
            message: { contains: 'reopen', mode: 'insensitive' },
          },
          select: { incidentId: true },
        }),
        prisma.incidentEvent.findMany({
          where: {
            incidentId: { in: recentIncidentIds },
            message: { contains: 'auto-resolved', mode: 'insensitive' },
          },
          select: { incidentId: true },
        }),
      ])
    : [[], [], [], []];
  const [firstNotes, firstAlerts] = recentIncidentIds.length
    ? await Promise.all([
        prisma.incidentNote.groupBy({
          by: ['incidentId'],
          where: { incidentId: { in: recentIncidentIds } },
          _min: { createdAt: true },
        }),
        prisma.alert.groupBy({
          by: ['incidentId'],
          where: { incidentId: { in: recentIncidentIds } },
          _min: { createdAt: true },
        }),
      ])
    : [[], []];

  // Build Global Ack Map
  const ackMap = new Map<string, Date>();
  for (const i of recentIncidents) if (i.acknowledgedAt) ackMap.set(i.id, i.acknowledgedAt);
  for (const e of ackEvents) if (!ackMap.has(e.incidentId)) ackMap.set(e.incidentId, e.createdAt);

  const mttaSamples: number[] = [];
  const mttrSamples: number[] = [];
  for (const incident of recentIncidents) {
    const ackAt = ackMap.get(incident.id);
    if (ackAt && incident.createdAt) {
      mttaSamples.push(ackAt.getTime() - incident.createdAt.getTime());
    }

    if (incident.status === 'RESOLVED') {
      const resolvedAt = incident.resolvedAt || incident.updatedAt;
      if (resolvedAt && incident.createdAt) {
        mttrSamples.push(resolvedAt.getTime() - incident.createdAt.getTime());
      }
    }
  }

  const firstNoteMap = new Map(
    firstNotes
      .filter(entry => entry._min.createdAt)
      .map(entry => [entry.incidentId, entry._min.createdAt as Date])
  );
  const firstAlertMap = new Map(
    firstAlerts
      .filter(entry => entry._min.createdAt)
      .map(entry => [entry.incidentId, entry._min.createdAt as Date])
  );
  const mttiSamples = recentIncidents
    .map(incident => {
      const noteAt = firstNoteMap.get(incident.id);
      if (!noteAt) return null;
      return Math.max(0, noteAt.getTime() - incident.createdAt.getTime());
    })
    .filter((diff): diff is number => diff !== null);
  const mttkSamples = recentIncidents
    .map(incident => {
      const alertAt = firstAlertMap.get(incident.id);
      if (!alertAt) return null;
      return Math.max(0, incident.createdAt.getTime() - alertAt.getTime());
    })
    .filter((diff): diff is number => diff !== null);
  const mttiMs = mttiSamples.length
    ? mttiSamples.reduce((sum, diff) => sum + diff, 0) / mttiSamples.length
    : null;
  const mttkMs = mttkSamples.length
    ? mttkSamples.reduce((sum, diff) => sum + diff, 0) / mttkSamples.length
    : null;

  // Calc Metrics Helper
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const calculateSetMetrics = (incidents: any[], eventsMap: Map<string, Date>) => {
    let ackSum = 0,
      ackCount = 0;
    let resolveSum = 0,
      resolveCount = 0;
    let highUrg = 0;

    for (const inc of incidents) {
      if (inc.urgency === 'HIGH') highUrg++;

      // Ack
      const ackAt = inc.acknowledgedAt || eventsMap.get(inc.id);
      if (ackAt && inc.createdAt) {
        ackSum += ackAt.getTime() - inc.createdAt.getTime();
        ackCount++;
      }

      // Resolve
      if (inc.status === 'RESOLVED') {
        const resAt = inc.resolvedAt || inc.updatedAt;
        if (resAt && inc.createdAt) {
          resolveSum += resAt.getTime() - inc.createdAt.getTime();
          resolveCount++;
        }
      }
    }
    return {
      count: incidents.length,
      highUrg,
      mtta: ackCount ? ackSum / ackCount : 0,
      mttr: resolveCount ? resolveSum / resolveCount : 0,
      ackRate: incidents.length ? (ackCount / incidents.length) * 100 : 0,
      resolveRate: incidents.length ? (resolveCount / incidents.length) * 100 : 0,
    };
  };

  const currentStats = calculateSetMetrics(recentIncidents, ackMap);

  const prevAckMap = new Map<string, Date>();
  for (const incident of previousIncidents) {
    if (incident.acknowledgedAt) prevAckMap.set(incident.id, incident.acknowledgedAt);
  }
  const prevStatsDetailed = calculateSetMetrics(previousIncidents, prevAckMap);

  const mttaP50Ms = calculatePercentile(mttaSamples, 50);
  const mttaP95Ms = calculatePercentile(mttaSamples, 95);
  const mttrP50Ms = calculatePercentile(mttrSamples, 50);
  const mttrP95Ms = calculatePercentile(mttrSamples, 95);

  // Ack Rate & Map for legacy logic re-use if needed
  const ackRate = currentStats.ackRate;
  const resolveRate = currentStats.resolveRate;

  // Previous Metrics (Approximation)
  const prevAckSum = previousIncidents.reduce(
    (sum, i) => sum + (i.acknowledgedAt ? i.acknowledgedAt.getTime() - i.createdAt.getTime() : 0),
    0
  );
  const prevAckCount = previousIncidents.filter(i => i.acknowledgedAt).length;
  const prevResolveSum = previousIncidents.reduce(
    (sum, i) => sum + (i.resolvedAt ? i.resolvedAt.getTime() - i.createdAt.getTime() : 0),
    0
  );
  const prevResolveCount = previousIncidents.filter(i => i.resolvedAt).length;

  const prevStats = {
    count: previousIncidents.length,
    mtta: prevAckCount ? prevAckSum / prevAckCount : 0,
    mttr: prevResolveCount ? prevResolveSum / prevResolveCount : 0,
  };

  // Insights
  const insights: SLAMetrics['insights'] = [];
  if (currentStats.count > prevStats.count)
    insights.push({
      type: 'negative',
      text: `Incident volume up ${currentStats.count - prevStats.count} vs previous period`,
    });
  else if (currentStats.count < prevStats.count)
    insights.push({
      type: 'positive',
      text: `Incident volume down ${Math.abs(currentStats.count - prevStats.count)} vs previous period`,
    });

  if (currentStats.mtta < prevStats.mtta && prevStats.mtta > 0)
    insights.push({
      type: 'positive',
      text: `Response time improved by ${Math.round((1 - currentStats.mtta / prevStats.mtta) * 100)}%`,
    });
  else if (currentStats.mtta > prevStats.mtta)
    insights.push({
      type: 'negative',
      text: `Response time slower by ${Math.round((currentStats.mtta / prevStats.mtta - 1) * 100)}%`,
    });

  // SLA Compliance Details
  let ackSlaMet = 0,
    resolveSlaMet = 0;
  const solvedIncidents = recentIncidents.filter(i => i.status === 'RESOLVED');
  const defaultAckTarget = 15,
    defaultResolveTarget = 120;

  for (const incident of recentIncidents) {
    const ackTarget = incident.service.targetAckMinutes ?? defaultAckTarget;
    const resolveTarget = incident.service.targetResolveMinutes ?? defaultResolveTarget;
    const ackedAt = ackMap.get(incident.id);
    if (ackedAt && incident.createdAt) {
      const diffMin = (ackedAt.getTime() - incident.createdAt.getTime()) / 60000;
      if (diffMin <= ackTarget) ackSlaMet++;
    }
    if (incident.status === 'RESOLVED') {
      const resolvedAt = incident.resolvedAt || incident.updatedAt;
      if (resolvedAt && incident.createdAt) {
        const diffMin = (resolvedAt.getTime() - incident.createdAt.getTime()) / 60000;
        if (diffMin <= resolveTarget) resolveSlaMet++;
      }
    }
  }
  const ackCompliance = ackMap.size ? (ackSlaMet / ackMap.size) * 100 : 100;
  const resolveCompliance = solvedIncidents.length
    ? (resolveSlaMet / solvedIncidents.length) * 100
    : 100;

  // Charts: Daily Trends
  const useHourlyTrend = windowDays === 1;
  const trendStart = startOfDay(start);
  const trendSeries = Array.from({ length: useHourlyTrend ? 24 : windowDays }, (_, idx) => {
    const point = new Date(trendStart);
    if (useHourlyTrend) {
      point.setUTCHours(trendStart.getUTCHours() + idx);
    } else {
      point.setUTCDate(trendStart.getUTCDate() + idx);
    }
    return {
      date: point,
      key: useHourlyTrend ? toHourKey(point) : toDateKey(point),
      label: useHourlyTrend
        ? formatHourLabel(point, userTimeZone)
        : formatDayLabel(point, userTimeZone),
      count: 0,
      ackSum: 0,
      ackCount: 0,
      ackSlaMet: 0,
      resolveSum: 0,
      resolveCount: 0,
      escalationCount: 0,
    };
  });
  const trendIndex = new Map(trendSeries.map(entry => [entry.key, entry]));
  const getTrendKey = (date: Date) =>
    useHourlyTrend ? toHourKey(startOfHour(date)) : toDateKey(startOfDay(date));

  for (const incident of recentIncidents) {
    const key = getTrendKey(incident.createdAt);
    const trendEntry = trendIndex.get(key);
    if (trendEntry) {
      trendEntry.count += 1;
      const ackAt = ackMap.get(incident.id);
      if (ackAt) {
        trendEntry.ackSum += ackAt.getTime() - incident.createdAt.getTime();
        trendEntry.ackCount += 1;
        const ackTarget = incident.service.targetAckMinutes ?? defaultAckTarget;
        const ackDiffMin = (ackAt.getTime() - incident.createdAt.getTime()) / 60000;
        if (ackDiffMin <= ackTarget) trendEntry.ackSlaMet += 1;
      }
      if (incident.status === 'RESOLVED' && incident.resolvedAt) {
        trendEntry.resolveSum += incident.resolvedAt.getTime() - incident.createdAt.getTime();
        trendEntry.resolveCount += 1;
      }
    }
  }

  for (const event of escalationEvents) {
    if (!event.createdAt) continue;
    const key = getTrendKey(event.createdAt);
    const trendEntry = trendIndex.get(key);
    if (trendEntry) {
      trendEntry.escalationCount += 1;
    }
  }

  // Service Map
  // Service Map
  const serviceMap = new Map<
    string,
    {
      id: string;
      name: string;
      count: number;
      ackSum: number;
      ackCount: number;
      resolveSum: number;
      resolveCount: number;
      breaches: number;
      activeCount: number;
      criticalCount: number;
    }
  >();

  // Pre-fill with known services
  const serviceNameMap = new Map(services.map(s => [s.id, s.name]));
  for (const service of services) {
    serviceMap.set(service.id, {
      id: service.id,
      name: service.name,
      count: 0,
      ackSum: 0,
      ackCount: 0,
      resolveSum: 0,
      resolveCount: 0,
      breaches: 0,
      activeCount: 0,
      criticalCount: 0,
    });
  }

  // Hydrate Active/Critical Counts
  for (const group of serviceActiveCounts) {
    if (!group.serviceId) continue;
    const s = serviceMap.get(group.serviceId);
    if (s) s.activeCount = group._count._all;
  }
  for (const group of serviceCriticalCounts) {
    if (!group.serviceId) continue;
    const s = serviceMap.get(group.serviceId);
    if (s) s.criticalCount = group._count._all;
  }

  // Hydrate Recent Incident Stats
  for (const incident of recentIncidents) {
    if (!incident.serviceId) continue;
    // Note: If a service was created/deleted recently it might not be in 'services' list or 'recentIncidents' might have old ID.
    // Ensure we handle missing map entries if necessary (though services list should be fresh).
    const s = serviceMap.get(incident.serviceId);
    if (!s) {
      // Fallback for edge case where service exists in incident but not in service list (e.g. soft deleted?)
      // For now, we skip or create ad-hoc. Let's skip to keep list clean.
      continue;
    }

    s.count++;
    const ackAt = ackMap.get(incident.id);
    const ackTarget = incident.service.targetAckMinutes ?? 15;
    if (ackAt) {
      s.ackSum += ackAt.getTime() - incident.createdAt.getTime();
      s.ackCount++;
      if ((ackAt.getTime() - incident.createdAt.getTime()) / 60000 > ackTarget) s.breaches++;
    }
    if (incident.status === 'RESOLVED' && incident.resolvedAt) {
      s.resolveSum += incident.resolvedAt.getTime() - incident.createdAt.getTime();
      s.resolveCount++;
    }
  }

  const serviceMetrics = Array.from(serviceMap.values())
    .map(s => ({
      id: s.id,
      name: s.name,
      count: s.count,
      mtta: s.ackCount ? s.ackSum / s.ackCount / 60000 : 0,
      mttr: s.resolveCount ? s.resolveSum / s.resolveCount / 60000 : 0,
      slaBreaches: s.breaches,
      status: s.breaches === 0 ? 'Healthy' : s.breaches < 3 ? 'Degraded' : 'Critical',
      dynamicStatus: getServiceDynamicStatus({
        openIncidentCount: s.activeCount,
        hasCritical: s.criticalCount > 0,
      }),
      activeCount: s.activeCount,
      criticalCount: s.criticalCount,
    }))
    .sort((a, b) => b.count - a.count);

  const serviceTargets = new Map<string, { ackMinutes: number; resolveMinutes: number }>();
  for (const incident of recentIncidents) {
    if (!serviceTargets.has(incident.serviceId)) {
      serviceTargets.set(incident.serviceId, {
        ackMinutes: incident.service.targetAckMinutes ?? defaultAckTarget,
        resolveMinutes: incident.service.targetResolveMinutes ?? defaultResolveTarget,
      });
    }
  }

  const serviceSlaTable = buildServiceSlaTable(
    recentIncidents,
    ackMap,
    serviceTargets,
    serviceNameMap,
    defaultAckTarget,
    defaultResolveTarget
  );

  // Coverage & Others
  const mtbfMs = calculateMtbfMs(recentIncidents.map(i => i.createdAt));
  const afterHoursCount = recentIncidents.filter(i => isAfterHours(i.createdAt)).length;
  const afterHoursRate = currentStats.count ? (afterHoursCount / currentStats.count) * 100 : 0;

  const coverageDays = new Set<string>();
  let onCallHoursMs = 0;
  for (const shift of futureShifts) {
    const shiftStart = shift.start < now ? now : shift.start;
    const shiftEnd = shift.end > coverageWindowEnd ? coverageWindowEnd : shift.end;
    if (shiftEnd > shiftStart) {
      onCallHoursMs += shiftEnd.getTime() - shiftStart.getTime();
      const cursor = new Date(shiftStart);
      while (cursor <= shiftEnd) {
        coverageDays.add(cursor.toDateString());
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }
  const coveragePercent = Math.min(100, (coverageDays.size / coverageWindowDays) * 100);
  const coverageGapDays = Math.max(0, coverageWindowDays - coverageDays.size);

  // Rates
  const escalatedIds = new Set(escalationEvents.map(e => e.incidentId));
  const reopenedIds = new Set(reopenEvents.map(e => e.incidentId));
  const autoResolvedIds = new Set(autoResolveEvents.map(e => e.incidentId));
  const totalRecent = currentStats.count;
  const escalationRate = totalRecent ? (escalatedIds.size / totalRecent) * 100 : 0;
  const reopenRate = solvedIncidents.length ? (reopenedIds.size / solvedIncidents.length) * 100 : 0;
  const autoResolvedCount = solvedIncidents.filter(i => autoResolvedIds.has(i.id)).length;
  const manualResolvedCount = Math.max(0, solvedIncidents.length - autoResolvedCount);
  const eventsCount =
    ackEvents.length + escalationEvents.length + reopenEvents.length + autoResolveEvents.length;
  const autoResolveRate = solvedIncidents.length
    ? (autoResolvedCount / solvedIncidents.length) * 100
    : 0;
  const alertsPerIncident = totalRecent ? alertsCount / totalRecent : 0;

  // Heatmap
  const heatmapAggregation = new Map<string, number>();
  for (const incident of heatmapIncidents) {
    const d = new Date(incident.createdAt);
    // Force UTC date key: YYYY-MM-DD
    const key = d.toISOString().split('T')[0];
    heatmapAggregation.set(key, (heatmapAggregation.get(key) || 0) + 1);
  }
  const heatmapData = Array.from(heatmapAggregation.entries()).map(([dateStr, count]) => ({
    date: dateStr,
    count,
  }));

  // Status Mix
  const statusOrder = [...allowedStatus];
  const statusMap = new Map(statusTrends.map(e => [e.status, e._count._all]));
  const statusMix = statusOrder.map(status => ({ status, count: statusMap.get(status) ?? 0 }));

  const statusAges = buildStatusAges(recentIncidents, now, statusOrder);

  // Urgency Mix
  const urgencyMix = urgencyCounts.map(e => ({ urgency: e.urgency, count: e._count._all }));

  // Assignee Load
  const assigneeIds = assigneeCounts
    .map(e => e.assigneeId)
    .filter((id): id is string => Boolean(id));
  const onCallUserIds = Array.from(new Set(windowShifts.map(shift => shift.userId)));
  const userIds = Array.from(new Set([...assigneeIds, ...onCallUserIds]));
  const usersById = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userNameMap = new Map(usersById.map(u => [u.id, u.name || u.email || 'Unknown']));
  const assigneeLoad = assigneeCounts.map(e => ({
    id: e.assigneeId as string,
    name: userNameMap.get(e.assigneeId as string) || 'Unknown',
    count: e._count._all,
  }));

  const onCallLoad = buildOnCallLoad(windowShifts, recentIncidents, start, end, userNameMap);
  const onCallUsersCount = onCallUserIds.length;

  const activeStatusFinalMap = new Map(activeStatusBreakdown.map(e => [e.status, e._count._all]));

  const hasCritical = criticalActiveIncidents > 0;
  const hasDegraded = activeIncidents > 0 && !hasCritical; // Simplified for overall status

  return {
    // Lifecycle
    mttr: currentStats.mttr ? currentStats.mttr / 60000 : null,
    mttd: currentStats.mtta ? currentStats.mtta / 60000 : null,
    mtti: mttiMs === null ? null : mttiMs / 60000,
    mttk: mttkMs === null ? null : mttkMs / 60000,
    mttaP50: mttaP50Ms === null ? null : mttaP50Ms / 60000,
    mttaP95: mttaP95Ms === null ? null : mttaP95Ms / 60000,
    mttrP50: mttrP50Ms === null ? null : mttrP50Ms / 60000,
    mttrP95: mttrP95Ms === null ? null : mttrP95Ms / 60000,
    mtbfMs,

    // Compliance
    ackCompliance: Math.round(ackCompliance * 100) / 100,
    resolveCompliance: Math.round(resolveCompliance * 100) / 100,
    ackBreaches: Math.max(0, ackMap.size - ackSlaMet),
    resolveBreaches: Math.max(0, solvedIncidents.length - resolveSlaMet),

    // Counts
    totalIncidents: totalRecent,
    activeIncidents,
    unassignedActive,
    highUrgencyCount: currentStats.highUrg,
    alertsCount,
    openCount: activeStatusFinalMap.get('OPEN') ?? 0,
    acknowledgedCount: activeStatusFinalMap.get('ACKNOWLEDGED') ?? 0,
    snoozedCount: activeStatusFinalMap.get('SNOOZED') ?? 0,
    suppressedCount: activeStatusFinalMap.get('SUPPRESSED') ?? 0,
    resolved24h: resolved24hCount,
    dynamicStatus: hasCritical ? 'CRITICAL' : hasDegraded ? 'DEGRADED' : 'OPERATIONAL',
    activeCount: activeIncidents,
    criticalCount: criticalActiveIncidents,

    // Rates
    ackRate: Math.round(ackRate * 100) / 100,
    resolveRate: Math.round(resolveRate * 100) / 100,
    highUrgencyRate: totalRecent ? (currentStats.highUrg / totalRecent) * 100 : 0,
    afterHoursRate: Math.round(afterHoursRate * 100) / 100,
    alertsPerIncident: Math.round(alertsPerIncident * 100) / 100,
    escalationRate: Math.round(escalationRate * 100) / 100,
    reopenRate: Math.round(reopenRate * 100) / 100,
    autoResolveRate: Math.round(autoResolveRate * 100) / 100,

    previousPeriod: {
      totalIncidents: prevStatsDetailed.count,
      highUrgencyCount: prevStatsDetailed.highUrg,
      mtta: prevStatsDetailed.mtta ? prevStatsDetailed.mtta / 60000 : null,
      mttr: prevStatsDetailed.mttr ? prevStatsDetailed.mttr / 60000 : null,
      ackRate: Math.round(prevStatsDetailed.ackRate * 100) / 100,
      resolveRate: Math.round(prevStatsDetailed.resolveRate * 100) / 100,
    },

    // Events
    autoResolvedCount,
    manualResolvedCount,
    eventsCount,
    insights,

    // Coverage
    coveragePercent: Math.round(coveragePercent * 100) / 100,
    coverageGapDays,
    onCallHoursMs,
    onCallUsersCount,
    activeOverrides,

    // Golden Signals
    avgLatencyP99: null,
    errorRate: null,
    totalRequests: 0,
    saturation: null,

    // Charts
    trendSeries: trendSeries.map(s => ({
      key: s.key,
      label: s.label,
      count: s.count,
      mtta: s.ackCount ? s.ackSum / s.ackCount / 60000 : 0,
      mttr: s.resolveCount ? s.resolveSum / s.resolveCount / 60000 : 0,
      ackRate: s.count ? (s.ackCount / s.count) * 100 : 0,
      resolveRate: s.count ? (s.resolveCount / s.count) * 100 : 0,
      resolveCount: s.resolveCount,
      ackCompliance: s.ackCount ? (s.ackSlaMet / s.ackCount) * 100 : 0,
      escalationRate: s.count ? (s.escalationCount / s.count) * 100 : 0,
    })),
    statusMix,
    urgencyMix,
    topServices: serviceMetrics.slice(0, 5),
    serviceMetrics,
    assigneeLoad,
    statusAges,
    onCallLoad,
    serviceSlaTable,

    // V2 Additions
    recurringTitles: recurringTitleCounts.map(t => ({ title: t.title, count: t._count._all })),
    eventsPerIncident:
      totalRecent > 0
        ? (ackEvents.length +
            escalationEvents.length +
            reopenEvents.length +
            autoResolveEvents.length) /
          totalRecent
        : 0,
    heatmapData,
    currentShifts: currentShiftsData.map(s => ({
      id: s.id,
      user: { name: s.user.name },
      schedule: { name: s.schedule.name },
    })),
    recentIncidents: filters.includeIncidents
      ? recentIncidents.map(inc => ({
          id: inc.id,
          title: inc.title,
          description: inc.description,
          status: inc.status,
          urgency: inc.urgency,
          createdAt: inc.createdAt,
          resolvedAt: inc.resolvedAt,
          service: { id: inc.serviceId, name: inc.service.name, region: inc.service.region },
        }))
      : undefined,
  };
}

/**
 * Generate a daily SLA compliance snapshot for a specific definition and date
 * Consolidated from SLAService
 */
export async function generateDailySnapshot(definitionId: string, date: Date): Promise<void> {
  const { default: prisma } = await import('./prisma');

  const definition = await prisma.sLADefinition.findUnique({
    where: { id: definitionId },
  });

  if (!definition) {
    logger.warn(`[SLA] Definition not found for snapshot: ${definitionId}`);
    return;
  }

  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  // Filter incidents based on definition scope
  const whereClause: any = {
    createdAt: { gte: start, lte: end },
    serviceId: definition.serviceId || undefined,
  };

  const incidents = await prisma.incident.findMany({
    where: whereClause,
    select: {
      id: true,
      createdAt: true,
      acknowledgedAt: true,
      resolvedAt: true,
    },
  });

  let metAck = 0;
  let metResolve = 0;

  for (const incident of incidents) {
    if ((definition as any).targetAckTime && incident.acknowledgedAt) {
      const ackMinutes = (incident.acknowledgedAt.getTime() - incident.createdAt.getTime()) / 60000;
      if (ackMinutes <= (definition as any).targetAckTime) metAck++;
    }
    if ((definition as any).targetResolveTime && incident.resolvedAt) {
      const resolveMinutes = (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 60000;
      if (resolveMinutes <= (definition as any).targetResolveTime) metResolve++;
    }
  }

  const total = incidents.length;
  let score = 100;
  if (total > 0) {
    const ackScore = (definition as any).targetAckTime ? (metAck / total) * 100 : 100;
    const resolveScore = (definition as any).targetResolveTime ? (metResolve / total) * 100 : 100;
    score = (ackScore + resolveScore) / 2;
  }

  await prisma.sLASnapshot.upsert({
    where: {
      date_slaDefinitionId: {
        date: start,
        slaDefinitionId: definitionId,
      },
    },
    create: {
      slaDefinitionId: definitionId,
      date: start,
      totalIncidents: total,
      metAckTime: metAck,
      metResolveTime: metResolve,
      complianceScore: score,
    },
    update: {
      totalIncidents: total,
      metAckTime: metAck,
      metResolveTime: metResolve,
      complianceScore: score,
    },
  });

  logger.info(`[SLA] Snapshot updated`, { definitionId, date: start.toISOString(), score });
}

export async function checkIncidentSLA(incidentId: string): Promise<IncidentSLAResult> {
  const { default: prisma } = await import('./prisma');
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: { service: true },
  });

  if (!incident) throw new Error('Incident not found');

  const now = new Date();
  const createdAt = incident.createdAt.getTime();
  const elapsedMinutes = (now.getTime() - createdAt) / 60000;

  const targetAckMinutes = incident.service.targetAckMinutes || 15;
  const targetResolveMinutes = incident.service.targetResolveMinutes || 120;

  let ackBreached = false,
    ackTimeRemaining: number | null = null;
  if (incident.acknowledgedAt) {
    const ackTime = (incident.acknowledgedAt.getTime() - createdAt) / 60000;
    ackBreached = ackTime > targetAckMinutes;
  } else if (incident.status !== 'RESOLVED') {
    ackBreached = elapsedMinutes > targetAckMinutes;
    ackTimeRemaining = Math.max(0, targetAckMinutes - elapsedMinutes);
  }

  let resolveBreached = false,
    resolveTimeRemaining: number | null = null;
  if (incident.resolvedAt) {
    const resolveTime = (incident.resolvedAt.getTime() - createdAt) / 60000;
    resolveBreached = resolveTime > targetResolveMinutes;
  } else if (incident.status !== 'RESOLVED') {
    resolveBreached = elapsedMinutes > targetResolveMinutes;
    resolveTimeRemaining = Math.max(0, targetResolveMinutes - elapsedMinutes);
  }

  return {
    ackSLA: {
      breached: ackBreached,
      timeRemaining: ackTimeRemaining,
      targetMinutes: targetAckMinutes,
    },
    resolveSLA: {
      breached: resolveBreached,
      timeRemaining: resolveTimeRemaining,
      targetMinutes: targetResolveMinutes,
    },
  };
}

/**
 * Merges overlapping time intervals and calculates total duration in ms
 */
function calculateMergedDuration(intervals: Array<{ start: Date; end: Date }>): number {
  if (intervals.length === 0) return 0;

  // Sort by start time
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Array<{ start: Date; end: Date }> = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];

    if (next.start <= current.end) {
      // Overlap, extend current
      if (next.end > current.end) {
        current.end = next.end;
      }
    } else {
      // No overlap, push current and move to next
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged.reduce((sum, interval) => {
    return sum + (interval.end.getTime() - interval.start.getTime());
  }, 0);
}

/**
 * Calculates uptime percentage for a set of services over a given period
 * Shared logic for Status Pages and Exports
 */
export async function calculateMultiServiceUptime(
  serviceIds: string[],
  startDate: Date,
  endDate: Date = new Date()
): Promise<Record<string, number>> {
  const { default: prisma } = await import('./prisma');

  const incidents = await prisma.incident.findMany({
    where: {
      serviceId: { in: serviceIds },
      AND: [
        { createdAt: { lt: endDate } },
        {
          OR: [{ resolvedAt: { gte: startDate } }, { status: { in: ['OPEN', 'ACKNOWLEDGED'] } }],
        },
      ],
    },
    select: {
      serviceId: true,
      createdAt: true,
      resolvedAt: true,
      status: true,
    },
  });

  const uptimeByService: Record<string, number> = {};
  const totalMs = endDate.getTime() - startDate.getTime();

  for (const serviceId of serviceIds) {
    if (totalMs <= 0) {
      uptimeByService[serviceId] = 100;
      continue;
    }

    const serviceIncidents = incidents.filter(
      inc => inc.serviceId === serviceId && inc.status !== 'SUPPRESSED' && inc.status !== 'SNOOZED'
    );

    const intervals = serviceIncidents
      .map(incident => ({
        start: incident.createdAt > startDate ? incident.createdAt : startDate,
        end: incident.resolvedAt && incident.resolvedAt < endDate ? incident.resolvedAt : endDate,
      }))
      .filter(interval => interval.start < interval.end);

    const downtimeMs = calculateMergedDuration(intervals);
    const uptime = ((totalMs - downtimeMs) / totalMs) * 100;
    uptimeByService[serviceId] = Math.max(0, Math.min(100, uptime));
  }

  return uptimeByService;
}

/**
 * Get the current health status labels for public status pages
 * Map dynamicStatus to External Status Labels
 */
export function getExternalStatusLabel(dynamicStatus: string): string {
  switch (dynamicStatus) {
    case 'CRITICAL':
      return 'MAJOR_OUTAGE';
    case 'DEGRADED':
      return 'PARTIAL_OUTAGE';
    case 'OPERATIONAL':
    default:
      return 'OPERATIONAL';
  }
}
