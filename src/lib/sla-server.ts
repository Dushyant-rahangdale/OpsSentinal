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

/**
 * Extended SLA Metrics Filter
 * Supports all legacy analytics filters
 */
type SLAMetricsFilter = {
  serviceId?: string;
  teamId?: string;
  assigneeId?: string | null;
  urgency?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'OPEN' | 'ACKNOWLEDGED' | 'SNOOZED' | 'SUPPRESSED' | 'RESOLVED';
  startDate?: Date;
  endDate?: Date;
  windowDays?: number;
  includeAllTime?: boolean;
  userTimeZone?: string;
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
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfHour(date: Date) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toHourKey(date: Date) {
  const dayKey = toDateKey(date);
  const hour = `${date.getHours()}`.padStart(2, '0');
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
  let teamServiceIds: string[] | null = null;
  if (filters.teamId) {
    const teamServices = await prisma.service.findMany({
      where: { teamId: filters.teamId },
      select: { id: true },
    });
    teamServiceIds = teamServices.map(s => s.id);
  }

  const serviceWhere = filters.serviceId
    ? { serviceId: filters.serviceId }
    : teamServiceIds
      ? { serviceId: { in: teamServiceIds } }
      : null;

  const assigneeWhere = filters.assigneeId ? { assigneeId: filters.assigneeId } : null;
  const statusWhere = filters.status ? { status: filters.status } : null;
  const urgencyWhere = filters.urgency ? { urgency: filters.urgency } : null;

  const activeStatusWhere = filters.status
    ? { status: filters.status }
    : { status: { not: 'RESOLVED' as const } };
  const activeWhere: Prisma.IncidentWhereInput = {
    ...activeStatusWhere,
    ...(serviceWhere ?? {}),
    ...(urgencyWhere ?? {}),
    ...(assigneeWhere ?? {}),
  };

  const recentIncidentWhere: Prisma.IncidentWhereInput = {
    createdAt: { gte: start, lte: end },
    ...(serviceWhere ?? {}),
    ...(urgencyWhere ?? {}),
    ...(statusWhere ?? {}),
    ...(assigneeWhere ?? {}),
  };

  // Heatmap query (always last 365 days regardless of window)
  const heatmapStart = new Date(now);
  heatmapStart.setDate(now.getDate() - 365);
  const heatmapWhere: Prisma.IncidentWhereInput = {
    ...recentIncidentWhere,
    createdAt: { gte: heatmapStart, ...(end ? { lte: end } : {}) },
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
    activeIncidents,
    unassignedActive,
    recentIncidents,
    previousIncidents,
    alertsCount,
    futureShifts,
    windowShifts,
    activeOverrides,
    statusTrends,
    services,
    assigneeCounts,
    recurringTitleCounts,
    heatmapIncidents,
  ] = await Promise.all([
    prisma.incident.count({ where: activeWhere }),
    prisma.incident.count({ where: { ...activeWhere, assigneeId: null } }),
    prisma.incident.findMany({
      where: recentIncidentWhere,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        urgency: true,
        assigneeId: true,
        serviceId: true,
        acknowledgedAt: true,
        resolvedAt: true,
        service: { select: { targetAckMinutes: true, targetResolveMinutes: true } },
      },
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
    prisma.alert.count({ where: { createdAt: { gte: start }, ...(serviceWhere ?? {}) } }),
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
    prisma.service.findMany({ select: { id: true, name: true } }),
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
  ]);

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
  const insights = [];
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
      point.setHours(trendStart.getHours() + idx);
    } else {
      point.setDate(trendStart.getDate() + idx);
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
    }
  >();
  const serviceNameMap = new Map(services.map(s => [s.id, s.name]));
  for (const incident of recentIncidents) {
    if (!incident.serviceId) continue;
    if (!serviceMap.has(incident.serviceId)) {
      serviceMap.set(incident.serviceId, {
        id: incident.serviceId,
        name: serviceNameMap.get(incident.serviceId) || 'Unknown',
        count: 0,
        ackSum: 0,
        ackCount: 0,
        resolveSum: 0,
        resolveCount: 0,
        breaches: 0,
      });
    }
    const s = serviceMap.get(incident.serviceId)!;
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
    const key = toDateKey(startOfDay(incident.createdAt));
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

  return {
    // Lifecycle
    mttr: currentStats.mttr ? currentStats.mttr / 60000 : null,
    mttd: currentStats.mtta ? currentStats.mtta / 60000 : null,
    mtti: null,
    mttk: null,
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
      mtta: prevStatsDetailed.mtta ? prevStatsDetailed.mtta / 60000 : null,
      mttr: prevStatsDetailed.mttr ? prevStatsDetailed.mttr / 60000 : null,
      ackRate: Math.round(prevStatsDetailed.ackRate * 100) / 100,
      resolveRate: Math.round(prevStatsDetailed.resolveRate * 100) / 100,
    },

    // Events
    autoResolvedCount,
    manualResolvedCount,
    eventsCount,

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
      ackCompliance: s.ackCount ? (s.ackSlaMet / s.ackCount) * 100 : 0,
      escalationRate: s.count ? (s.escalationCount / s.count) * 100 : 0,
    })),
    statusMix,
    topServices: serviceMetrics.slice(0, 5),
    serviceMetrics,
    assigneeLoad,
    statusAges,
    onCallLoad,
    serviceSlaTable,
    insights,

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
  };
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
