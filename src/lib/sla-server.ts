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
import {
  getRetentionPolicy,
  getQueryDateBounds,
  shouldUseRollups,
  type RetentionPolicy,
} from './retention-policy';

/**
 * SLA Server - World-Class SLA Metrics Calculation
 *
 * DESIGN PRINCIPLES:
 * 1. Accuracy over performance - fetch ALL data within retention window
 * 2. No hardcoded limits - use admin-configurable retention policy
 * 3. No silent defaults - return null when data is insufficient
 * 4. Consistent time handling - use userTimeZone throughout
 * 5. Complete breach tracking - include overdue unacked/unresolved incidents
 * 6. Deterministic ordering - always sort events for consistent results
 * 7. Historical data - use rollups for data beyond realTimeWindowDays
 */

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
  includeActiveIncidents?: boolean;
  // Pagination support for large datasets
  page?: number;
  pageSize?: number;
};

const allowedStatus = ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED', 'RESOLVED'] as const;

// Default SLA targets (in minutes)
const DEFAULT_ACK_TARGET_MINUTES = 15;
const DEFAULT_RESOLVE_TARGET_MINUTES = 120;

// Default pagination for UI display
const DEFAULT_INCIDENT_DISPLAY_LIMIT = 50;
const DEFAULT_PAGE_SIZE = 100;

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

/**
 * Validates and normalizes a timezone string
 */
function normalizeTimeZone(tz: string | undefined): string {
  if (!tz) return 'UTC';
  try {
    // Test if timezone is valid
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    logger.warn(`[SLA] Invalid timezone "${tz}", falling back to UTC`);
    return 'UTC';
  }
}

/**
 * Gets the date key for bucketing in a specific timezone
 */
function toDateKeyInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Returns YYYY-MM-DD
}

/**
 * Gets the hour key for bucketing in a specific timezone
 */
function toHourKeyInTimeZone(date: Date, timeZone: string): string {
  const dayKey = toDateKeyInTimeZone(date, timeZone);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  });
  const hour = formatter.format(date).padStart(2, '0');
  return `${dayKey}-${hour}`;
}

function formatDayLabel(date: Date, timeZone: string = 'UTC') {
  return formatDateTime(date, timeZone, { format: 'short' });
}

function formatHourLabel(date: Date, timeZone: string = 'UTC') {
  return formatDateTime(date, timeZone, { format: 'time' });
}

/**
 * Checks if a date falls outside business hours in a specific timezone
 * Business hours: Monday-Friday, 8am-6pm
 */
function isAfterHoursInTimeZone(date: Date, timeZone: string): boolean {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12', 10);

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const isBusinessHours = hour >= 8 && hour < 18;

  return isWeekend || !isBusinessHours;
}

/**
 * Calculate SLA metrics with all filters & legacy parity
 *
 * FEATURES:
 * 1. Fetches ALL incidents within retention window - no hardcoded limits
 * 2. Uses admin-configurable retention policy for date bounds
 * 3. Uses earliest ack event (deterministic)
 * 4. Compliance is null when insufficient data, not 100%
 * 5. Breaches include overdue unacked/unresolved incidents
 * 6. Uses userTimeZone for after-hours calculation
 * 7. alertsCount uses both start and end date
 * 8. Previous period uses actual date range duration
 * 9. serviceMetrics.slaBreaches includes both ack and resolve breaches
 * 10. Trend bucketing uses userTimeZone consistently
 * 11. Supports pagination for large datasets
 * 12. Uses rollup data for historical periods beyond realTimeWindowDays
 */
export async function calculateSLAMetrics(filters: SLAMetricsFilter = {}): Promise<SLAMetrics> {
  // Performance monitoring: Start timing
  const queryStartTime = Date.now();

  const { default: prisma } = await import('./prisma');

  // 1. Fetch retention policy - NO HARDCODED LIMITS
  const retentionPolicy = await getRetentionPolicy();

  // 2. Validate and normalize inputs
  const now = new Date();
  const windowDays = Math.max(1, filters.windowDays || 7);
  const coverageWindowDays = 14;
  const userTimeZone = normalizeTimeZone(filters.userTimeZone);

  // Calculate time window with retention policy
  let requestedStart = filters.startDate;
  const requestedEnd = filters.endDate || now;

  if (!requestedStart) {
    if (filters.includeAllTime) {
      // "All Time" means within retention policy - NOT hardcoded!
      requestedStart = new Date(now);
      requestedStart.setDate(requestedStart.getDate() - retentionPolicy.incidentRetentionDays);
    } else {
      requestedStart = new Date(now);
      requestedStart.setDate(now.getDate() - windowDays);
    }
  }
  const requestedStartDate = requestedStart ?? now;
  const requestedEndDate = requestedEnd;

  // Apply retention policy bounds - this ensures we never query beyond retained data
  const { start, end, isClipped } = await getQueryDateBounds(
    requestedStartDate,
    requestedEndDate,
    'incident'
  );

  if (isClipped) {
    logger.info('[SLA] Date range clipped to retention policy', {
      requested: { start: requestedStart?.toISOString(), end: requestedEnd?.toISOString() },
      actual: { start: start.toISOString(), end: end.toISOString() },
      retentionDays: retentionPolicy.incidentRetentionDays,
    });
  }

  // Validate date range
  let finalStart = start;
  let finalEnd = end;
  if (finalStart > finalEnd) {
    logger.warn('[SLA] Start date is after end date, swapping');
    [finalStart, finalEnd] = [finalEnd, finalStart];
  }

  const { start: alertStart, end: alertEnd } = await getQueryDateBounds(
    requestedStartDate,
    requestedEndDate,
    'alert'
  );

  // Check if we should use rollup data for this historical query
  // This dramatically improves performance for queries beyond the real-time window
  const useRollups = await shouldUseRollups(finalStart);
  if (useRollups) {
    // For historical queries, use pre-aggregated rollups
    logger.info('[SLA] Using rollup data for historical query', {
      start: finalStart.toISOString(),
      end: finalEnd.toISOString(),
    });

    const serviceIdFilter = Array.isArray(filters.serviceId)
      ? filters.serviceId[0]
      : filters.serviceId;

    const teamIdFilter = Array.isArray(filters.teamId) ? filters.teamId[0] : filters.teamId;

    const rollupMetrics = await calculateSLAMetricsFromRollups(finalStart, finalEnd, {
      serviceId: serviceIdFilter,
      teamId: teamIdFilter,
    });

    // Return metrics from rollups
    const totalQueryDuration = Date.now() - queryStartTime;
    logger.info('[SLA] Query performance (rollups)', {
      duration: totalQueryDuration,
      incidentCount: rollupMetrics.totalIncidents,
      dataSource: 'rollup',
    });

    return {
      ...rollupMetrics,
      requestedStart: requestedStart || start,
      requestedEnd: requestedEnd,
      isClipped: isClipped,
    };
  }

  // Calculate actual window duration for previous period comparison
  const actualWindowMs = finalEnd.getTime() - finalStart.getTime();
  const actualWindowDays = Math.ceil(actualWindowMs / (24 * 60 * 60 * 1000));

  const coverageWindowEnd = new Date(now);
  coverageWindowEnd.setDate(now.getDate() + coverageWindowDays);

  // Pagination settings
  const pageSize = filters.pageSize || DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page || 1);

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
    createdAt: { gte: finalStart, lte: finalEnd },
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

  // Heatmap query (last 365 days, clipped to retention policy)
  const heatmapStartRequested = new Date(now);
  heatmapStartRequested.setDate(now.getDate() - 365);
  const { start: heatmapStart } = await getQueryDateBounds(heatmapStartRequested, now, 'incident');
  const heatmapWhere: Prisma.IncidentWhereInput = {
    ...recentIncidentWhere,
    createdAt: { gte: heatmapStart, lte: now },
  };

  // Previous Period Query - FIX: Use actual window duration, not fixed windowDays
  const previousStart = new Date(finalStart.getTime() - actualWindowMs);
  const previousEnd = new Date(finalStart);
  const previousWhere: Prisma.IncidentWhereInput = {
    ...recentIncidentWhere,
    createdAt: { gte: previousStart, lt: previousEnd },
  };

  // 3. Parallel Data Fetching
  // FIX: Fetch ALL incidents for metrics (up to MAX_INCIDENTS_FOR_METRICS)
  // Only limit the returned incidents for UI display
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
    allRecentIncidents,
    previousIncidents,
    totalIncidentCount,
  ] = await Promise.all([
    // Active breakdown (Status, Urgency, Assignment) - Batch fetch
    prisma.incident.findMany({
      where: activeWhere,
      select: {
        id: true,
        title: true,
        status: true,
        urgency: true,
        assigneeId: true,
        serviceId: true,
        createdAt: true,
        acknowledgedAt: true,
      },
    }),
    // FIX: alertsCount now uses both start AND end date
    prisma.alert.count({
      where: {
        createdAt: { gte: alertStart, lte: alertEnd },
        ...(Object.keys(serviceWhere).length > 0 ? serviceWhere : {}),
      },
    }),
    prisma.onCallShift.findMany({
      where: { end: { gte: now }, start: { lte: coverageWindowEnd } },
      select: { start: true, end: true, userId: true },
    }),
    prisma.onCallShift.findMany({
      where: { end: { gte: finalStart }, start: { lte: finalEnd } },
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
      select: { id: true, name: true, targetAckMinutes: true, targetResolveMinutes: true },
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
    // NO HARDCODED LIMITS - Fetch ALL incidents within retention window
    // The retention policy controls the date range, not an arbitrary count limit
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
      // NO TAKE LIMIT - controlled by retention policy date bounds
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
      // NO TAKE LIMIT - controlled by retention policy date bounds
    }),
    // Get total count for pagination info
    prisma.incident.count({ where: recentIncidentWhere }),
  ]);

  // Performance monitoring: Log query completion with timing
  const dbQueryDuration = Date.now() - queryStartTime;
  logger.debug('[SLA] Database queries completed', {
    duration: dbQueryDuration,
    incidentCount: allRecentIncidents.length,
    totalIncidentCount,
    dateRange: { start: finalStart.toISOString(), end: finalEnd.toISOString() },
    retentionDays: retentionPolicy.incidentRetentionDays,
  });

  // Use all incidents for metrics calculation
  const recentIncidents = allRecentIncidents;

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

  // Build service target maps for SLA calculations
  const serviceTargetMap = new Map<string, { ackMinutes: number; resolveMinutes: number }>();
  for (const service of services) {
    serviceTargetMap.set(service.id, {
      ackMinutes: service.targetAckMinutes ?? DEFAULT_ACK_TARGET_MINUTES,
      resolveMinutes: service.targetResolveMinutes ?? DEFAULT_RESOLVE_TARGET_MINUTES,
    });
  }
  // Add targets from incidents for services not in the services list
  for (const incident of recentIncidents) {
    if (!serviceTargetMap.has(incident.serviceId)) {
      serviceTargetMap.set(incident.serviceId, {
        ackMinutes: incident.service.targetAckMinutes ?? DEFAULT_ACK_TARGET_MINUTES,
        resolveMinutes: incident.service.targetResolveMinutes ?? DEFAULT_RESOLVE_TARGET_MINUTES,
      });
    }
  }

  // 4. Fetch Incident Events
  const recentIncidentIds = recentIncidents.map(i => i.id);
  const [ackEvents, escalationEvents, reopenEvents, autoResolveEvents] = recentIncidentIds.length
    ? await Promise.all([
        // FIX: Add ordering to get EARLIEST ack event, not random
        prisma.incidentEvent.findMany({
          where: {
            incidentId: { in: recentIncidentIds },
            message: { contains: 'acknowledged', mode: 'insensitive' },
          },
          select: { incidentId: true, createdAt: true },
          orderBy: { createdAt: 'asc' }, // CRITICAL: Get earliest event first
        }),
        prisma.incidentEvent.findMany({
          where: {
            incidentId: { in: recentIncidentIds },
            message: { contains: 'escalated to', mode: 'insensitive' },
          },
          select: { incidentId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
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

  // Build Global Ack Map - FIX: Use earliest ack event due to ordering above
  const ackMap = new Map<string, Date>();
  // First, use acknowledgedAt from incident (most reliable)
  for (const i of recentIncidents) {
    if (i.acknowledgedAt) {
      ackMap.set(i.id, i.acknowledgedAt);
    }
  }
  // Then, fall back to earliest ack event (events are now ordered by createdAt asc)
  for (const e of ackEvents) {
    if (!ackMap.has(e.incidentId)) {
      ackMap.set(e.incidentId, e.createdAt);
    }
  }

  // Calculate MTTA/MTTR samples
  const mttaSamples: number[] = [];
  const mttrSamples: number[] = [];
  for (const incident of recentIncidents) {
    const ackAt = ackMap.get(incident.id);
    if (ackAt && incident.createdAt) {
      const ackTimeMs = ackAt.getTime() - incident.createdAt.getTime();
      if (ackTimeMs >= 0) {
        // Validate: ack can't be before creation
        mttaSamples.push(ackTimeMs);
      }
    }

    if (incident.status === 'RESOLVED') {
      const resolvedAt = incident.resolvedAt || incident.updatedAt;
      if (resolvedAt && incident.createdAt) {
        const resolveTimeMs = resolvedAt.getTime() - incident.createdAt.getTime();
        if (resolveTimeMs >= 0) {
          // Validate: resolve can't be before creation
          mttrSamples.push(resolveTimeMs);
        }
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
  const calculateSetMetrics = (
    incidents: Array<{
      id: string;
      urgency: string;
      acknowledgedAt: Date | null;
      createdAt: Date;
      status: string;
      resolvedAt: Date | null;
      updatedAt?: Date | null;
    }>,
    eventsMap: Map<string, Date>
  ) => {
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
        const diff = ackAt.getTime() - inc.createdAt.getTime();
        if (diff >= 0) {
          ackSum += diff;
          ackCount++;
        }
      }

      // Resolve
      if (inc.status === 'RESOLVED') {
        const resAt = inc.resolvedAt || inc.updatedAt;
        if (resAt && inc.createdAt) {
          const diff = resAt.getTime() - inc.createdAt.getTime();
          if (diff >= 0) {
            resolveSum += diff;
            resolveCount++;
          }
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

  // Insights
  const insights: SLAMetrics['insights'] = [];
  if (currentStats.count > prevStatsDetailed.count && prevStatsDetailed.count > 0) {
    insights.push({
      type: 'negative',
      text: `Incident volume up ${currentStats.count - prevStatsDetailed.count} vs previous period`,
    });
  } else if (currentStats.count < prevStatsDetailed.count) {
    insights.push({
      type: 'positive',
      text: `Incident volume down ${Math.abs(currentStats.count - prevStatsDetailed.count)} vs previous period`,
    });
  }

  if (currentStats.mtta < prevStatsDetailed.mtta && prevStatsDetailed.mtta > 0) {
    insights.push({
      type: 'positive',
      text: `Response time improved by ${Math.round((1 - currentStats.mtta / prevStatsDetailed.mtta) * 100)}%`,
    });
  } else if (currentStats.mtta > prevStatsDetailed.mtta && prevStatsDetailed.mtta > 0) {
    insights.push({
      type: 'negative',
      text: `Response time slower by ${Math.round((currentStats.mtta / prevStatsDetailed.mtta - 1) * 100)}%`,
    });
  }

  // SLA Compliance Details - FIX: Include overdue unacked/unresolved incidents as breaches
  let ackSlaMet = 0;
  let ackSlaBreached = 0;
  let resolveSlaMet = 0;
  let resolveSlaBreached = 0;

  const solvedIncidents = recentIncidents.filter(i => i.status === 'RESOLVED');

  for (const incident of recentIncidents) {
    const targets = serviceTargetMap.get(incident.serviceId) || {
      ackMinutes: DEFAULT_ACK_TARGET_MINUTES,
      resolveMinutes: DEFAULT_RESOLVE_TARGET_MINUTES,
    };
    const ackTarget = targets.ackMinutes;
    const resolveTarget = targets.resolveMinutes;

    // ACK SLA
    const ackedAt = ackMap.get(incident.id);
    if (ackedAt && incident.createdAt) {
      const diffMin = (ackedAt.getTime() - incident.createdAt.getTime()) / 60000;
      if (diffMin <= ackTarget) {
        ackSlaMet++;
      } else {
        ackSlaBreached++;
      }
    } else if (incident.status !== 'RESOLVED') {
      // FIX: Check if unacked incident is overdue
      const elapsedMin = (now.getTime() - incident.createdAt.getTime()) / 60000;
      if (elapsedMin > ackTarget) {
        ackSlaBreached++;
      }
      // If not overdue yet, don't count in either bucket (still pending)
    }

    // RESOLVE SLA
    if (incident.status === 'RESOLVED') {
      const resolvedAt = incident.resolvedAt || incident.updatedAt;
      if (resolvedAt && incident.createdAt) {
        const diffMin = (resolvedAt.getTime() - incident.createdAt.getTime()) / 60000;
        if (diffMin <= resolveTarget) {
          resolveSlaMet++;
        } else {
          resolveSlaBreached++;
        }
      }
    } else {
      // FIX: Check if unresolved incident is overdue
      const elapsedMin = (now.getTime() - incident.createdAt.getTime()) / 60000;
      if (elapsedMin > resolveTarget) {
        resolveSlaBreached++;
      }
      // If not overdue yet, don't count (still pending)
    }
  }

  // FIX: Compliance calculation - don't default to 100% when no data
  // ackCompliance = % of incidents that were acked within SLA (out of all that should have been acked by now or were acked)
  const totalAckEvaluated = ackSlaMet + ackSlaBreached;
  const ackCompliance = totalAckEvaluated > 0 ? (ackSlaMet / totalAckEvaluated) * 100 : null;

  // resolveCompliance = % of resolved incidents that were resolved within SLA
  const totalResolveEvaluated = resolveSlaMet + resolveSlaBreached;
  const resolveCompliance =
    totalResolveEvaluated > 0 ? (resolveSlaMet / totalResolveEvaluated) * 100 : null;

  // Charts: Daily Trends - FIX: Use userTimeZone for bucketing
  const useHourlyTrend = actualWindowDays === 1;
  const trendLength = useHourlyTrend ? 24 : actualWindowDays;

  const trendSeries = Array.from({ length: trendLength }, (_, idx) => {
    const point = new Date(finalStart);
    if (useHourlyTrend) {
      point.setHours(point.getHours() + idx);
    } else {
      point.setDate(point.getDate() + idx);
    }
    return {
      date: point,
      key: useHourlyTrend
        ? toHourKeyInTimeZone(point, userTimeZone)
        : toDateKeyInTimeZone(point, userTimeZone),
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

  // FIX: Use userTimeZone for bucketing incidents
  const getTrendKey = (date: Date) =>
    useHourlyTrend
      ? toHourKeyInTimeZone(date, userTimeZone)
      : toDateKeyInTimeZone(date, userTimeZone);

  for (const incident of recentIncidents) {
    const key = getTrendKey(incident.createdAt);
    const trendEntry = trendIndex.get(key);
    if (trendEntry) {
      trendEntry.count += 1;
      const ackAt = ackMap.get(incident.id);
      if (ackAt) {
        trendEntry.ackSum += ackAt.getTime() - incident.createdAt.getTime();
        trendEntry.ackCount += 1;
        const targets = serviceTargetMap.get(incident.serviceId);
        const ackTarget = targets?.ackMinutes ?? DEFAULT_ACK_TARGET_MINUTES;
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

  // Service Map - FIX: Track both ack and resolve breaches
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
      ackBreaches: number;
      resolveBreaches: number;
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
      ackBreaches: 0,
      resolveBreaches: 0,
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

  // Hydrate Recent Incident Stats - FIX: Include both ack and resolve breaches
  for (const incident of recentIncidents) {
    if (!incident.serviceId) continue;

    let s = serviceMap.get(incident.serviceId);
    if (!s) {
      // Create entry for services in incidents but not in services list
      s = {
        id: incident.serviceId,
        name: incident.service.name,
        count: 0,
        ackSum: 0,
        ackCount: 0,
        resolveSum: 0,
        resolveCount: 0,
        ackBreaches: 0,
        resolveBreaches: 0,
        activeCount: 0,
        criticalCount: 0,
      };
      serviceMap.set(incident.serviceId, s);
      serviceNameMap.set(incident.serviceId, incident.service.name);
    }

    s.count++;
    const targets = serviceTargetMap.get(incident.serviceId) || {
      ackMinutes: DEFAULT_ACK_TARGET_MINUTES,
      resolveMinutes: DEFAULT_RESOLVE_TARGET_MINUTES,
    };

    const ackAt = ackMap.get(incident.id);
    if (ackAt) {
      s.ackSum += ackAt.getTime() - incident.createdAt.getTime();
      s.ackCount++;
      if ((ackAt.getTime() - incident.createdAt.getTime()) / 60000 > targets.ackMinutes) {
        s.ackBreaches++;
      }
    } else if (incident.status !== 'RESOLVED') {
      // Check for overdue unacked
      const elapsedMin = (now.getTime() - incident.createdAt.getTime()) / 60000;
      if (elapsedMin > targets.ackMinutes) {
        s.ackBreaches++;
      }
    }

    if (incident.status === 'RESOLVED' && incident.resolvedAt) {
      s.resolveSum += incident.resolvedAt.getTime() - incident.createdAt.getTime();
      s.resolveCount++;
      if (
        (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 60000 >
        targets.resolveMinutes
      ) {
        s.resolveBreaches++;
      }
    } else if (incident.status !== 'RESOLVED') {
      // Check for overdue unresolved
      const elapsedMin = (now.getTime() - incident.createdAt.getTime()) / 60000;
      if (elapsedMin > targets.resolveMinutes) {
        s.resolveBreaches++;
      }
    }
  }

  // FIX: slaBreaches now includes BOTH ack and resolve breaches
  const serviceMetrics = Array.from(serviceMap.values())
    .map(s => ({
      id: s.id,
      name: s.name,
      count: s.count,
      mtta: s.ackCount ? s.ackSum / s.ackCount / 60000 : 0,
      mttr: s.resolveCount ? s.resolveSum / s.resolveCount / 60000 : 0,
      slaBreaches: s.ackBreaches + s.resolveBreaches, // FIX: Include both types
      status:
        s.ackBreaches + s.resolveBreaches === 0
          ? 'Healthy'
          : s.ackBreaches + s.resolveBreaches < 3
            ? 'Degraded'
            : 'Critical',
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
        ackMinutes: incident.service.targetAckMinutes ?? DEFAULT_ACK_TARGET_MINUTES,
        resolveMinutes: incident.service.targetResolveMinutes ?? DEFAULT_RESOLVE_TARGET_MINUTES,
      });
    }
  }

  const serviceSlaTable = buildServiceSlaTable(
    recentIncidents,
    ackMap,
    serviceTargets,
    serviceNameMap,
    DEFAULT_ACK_TARGET_MINUTES,
    DEFAULT_RESOLVE_TARGET_MINUTES
  );

  // Coverage & Others
  const mtbfMs = calculateMtbfMs(recentIncidents.map(i => i.createdAt));

  // FIX: Use userTimeZone for after-hours calculation
  const afterHoursCount = recentIncidents.filter(i =>
    isAfterHoursInTimeZone(i.createdAt, userTimeZone)
  ).length;
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

  // FIX: alertsPerIncident uses consistent counts
  const alertsPerIncident = totalRecent ? alertsCount / totalRecent : 0;

  // Heatmap
  const heatmapAggregation = new Map<string, number>();
  for (const incident of heatmapIncidents) {
    const d = new Date(incident.createdAt);
    // Use UTC for heatmap consistency
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

  const onCallLoad = buildOnCallLoad(
    windowShifts,
    recentIncidents,
    finalStart,
    finalEnd,
    userNameMap
  );
  const onCallUsersCount = onCallUserIds.length;

  const activeStatusFinalMap = new Map(activeStatusBreakdown.map(e => [e.status, e._count._all]));

  const hasCritical = criticalActiveIncidents > 0;
  const hasDegraded = activeIncidents > 0 && !hasCritical;

  // Prepare incidents for response (limited for UI display)
  const displayIncidents = recentIncidents.slice(
    0,
    filters.incidentLimit || DEFAULT_INCIDENT_DISPLAY_LIMIT
  );

  const activeIncidentSummaries = filters.includeActiveIncidents
    ? activeIncidentsData.map(incident => {
        const targets = serviceTargetMap.get(incident.serviceId) || {
          ackMinutes: DEFAULT_ACK_TARGET_MINUTES,
          resolveMinutes: DEFAULT_RESOLVE_TARGET_MINUTES,
        };
        return {
          id: incident.id,
          title: incident.title,
          status: incident.status,
          urgency: incident.urgency,
          createdAt: incident.createdAt,
          acknowledgedAt: incident.acknowledgedAt ?? null,
          serviceId: incident.serviceId,
          serviceName: serviceNameMap.get(incident.serviceId) || 'Unknown service',
          assigneeId: incident.assigneeId ?? null,
          targetAckMinutes: targets.ackMinutes,
          targetResolveMinutes: targets.resolveMinutes,
        };
      })
    : undefined;

  // Performance monitoring: Final timing and metrics
  const totalQueryDuration = Date.now() - queryStartTime;
  const incidentsPerSecond =
    totalIncidentCount > 0 && totalQueryDuration > 0
      ? Math.round(totalIncidentCount / (totalQueryDuration / 1000))
      : 0;

  logger.info('[SLA] Query performance', {
    duration: totalQueryDuration,
    incidentCount: totalIncidentCount,
    dateRange: {
      start: finalStart.toISOString(),
      end: finalEnd.toISOString(),
      days: actualWindowDays,
    },
    filters: {
      hasServiceFilter: !!filters.serviceId,
      hasTeamFilter: !!filters.teamId,
      hasAssigneeFilter: !!filters.assigneeId,
    },
    performanceMetric: {
      incidentsPerSecond,
      msPerIncident:
        totalIncidentCount > 0
          ? Math.round((totalQueryDuration / totalIncidentCount) * 100) / 100
          : null,
    },
  });
  // Write performance log to database using raw SQL (bypasses Prisma client cache)
  const serviceIdValue = Array.isArray(filters.serviceId)
    ? filters.serviceId[0]
    : filters.serviceId || null;
  const teamIdValue = Array.isArray(filters.teamId) ? filters.teamId[0] : filters.teamId || null;
  const perfId = `perf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  prisma.$executeRaw`
    INSERT INTO sla_performance_logs (id, timestamp, "serviceId", "teamId", "windowDays", "durationMs", "incidentCount")
    VALUES (${perfId}, NOW(), ${serviceIdValue}, ${teamIdValue}, ${actualWindowDays}, ${totalQueryDuration}, ${totalIncidentCount})
  `
    .then(() => {
      logger.info('[SLA] Performance log written', { id: perfId });
    })
    .catch((err: unknown) => {
      logger.error('[SLA] Failed to log performance', { err: String(err) });
    });

  // Slow query alert (>10s threshold)
  if (totalQueryDuration > 10000) {
    logger.error('[SLA] Slow query detected', {
      duration: totalQueryDuration,
      threshold: 10000,
      incidentCount: totalIncidentCount,
      filters: {
        serviceId: filters.serviceId,
        teamId: filters.teamId,
        windowDays: actualWindowDays,
      },
    });
  }

  // Large dataset warning (>50k incidents)
  if (totalIncidentCount > 50000) {
    logger.warn('[SLA] Large dataset detected, consider using streaming API or rollups', {
      count: totalIncidentCount,
      threshold: 50000,
      filters,
    });
  }

  return {
    // Retention metadata
    effectiveStart: finalStart,
    effectiveEnd: finalEnd,
    requestedStart: requestedStartDate,
    requestedEnd: requestedEndDate,
    isClipped,
    retentionDays: retentionPolicy.incidentRetentionDays,

    // Lifecycle - NOTE: mttd is actually MTTA (Mean Time To Acknowledge)
    mttr: currentStats.mttr ? currentStats.mttr / 60000 : null,
    mttd: currentStats.mtta ? currentStats.mtta / 60000 : null, // This is MTTA, kept as mttd for backward compat
    mtti: mttiMs === null ? null : mttiMs / 60000,
    mttk: mttkMs === null ? null : mttkMs / 60000,
    mttaP50: mttaP50Ms === null ? null : mttaP50Ms / 60000,
    mttaP95: mttaP95Ms === null ? null : mttaP95Ms / 60000,
    mttrP50: mttrP50Ms === null ? null : mttrP50Ms / 60000,
    mttrP95: mttrP95Ms === null ? null : mttrP95Ms / 60000,
    mtbfMs,

    // Compliance - FIX: Returns null instead of 100% when no data
    ackCompliance: ackCompliance !== null ? Math.round(ackCompliance * 100) / 100 : null,
    resolveCompliance:
      resolveCompliance !== null ? Math.round(resolveCompliance * 100) / 100 : null,
    ackBreaches: ackSlaBreached,
    resolveBreaches: resolveSlaBreached,

    // Counts - use actual total from database, not limited count
    totalIncidents: totalIncidentCount,
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
    activeIncidentSummaries,
    recentIncidents: filters.includeIncidents
      ? displayIncidents.map(inc => ({
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
  const whereClause: Prisma.IncidentWhereInput = {
    createdAt: { gte: start, lte: end },
    ...(definition.serviceId ? { serviceId: definition.serviceId } : {}),
  };

  const incidents = await prisma.incident.findMany({
    where: whereClause,
    select: {
      id: true,
      createdAt: true,
      acknowledgedAt: true,
      resolvedAt: true,
      status: true,
    },
  });

  let metAck = 0;
  let metResolve = 0;
  let totalAckEvaluated = 0;
  let totalResolveEvaluated = 0;

  const evaluationTime = end;
  const targetAckTime = (definition as { targetAckTime?: number }).targetAckTime;
  const targetResolveTime = (definition as { targetResolveTime?: number }).targetResolveTime;

  for (const incident of incidents) {
    // ACK evaluation
    if (targetAckTime) {
      if (incident.acknowledgedAt) {
        totalAckEvaluated++;
        const ackMinutes =
          (incident.acknowledgedAt.getTime() - incident.createdAt.getTime()) / 60000;
        if (ackMinutes <= targetAckTime) metAck++;
      } else if (incident.status !== 'RESOLVED') {
        // Check if overdue
        const elapsedMin = (evaluationTime.getTime() - incident.createdAt.getTime()) / 60000;
        if (elapsedMin > targetAckTime) {
          totalAckEvaluated++; // Count as breach
        }
      }
    }

    // RESOLVE evaluation
    if (targetResolveTime) {
      if (incident.resolvedAt) {
        totalResolveEvaluated++;
        const resolveMinutes =
          (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 60000;
        if (resolveMinutes <= targetResolveTime) metResolve++;
      } else if (incident.status !== 'RESOLVED') {
        // Check if overdue
        const elapsedMin = (evaluationTime.getTime() - incident.createdAt.getTime()) / 60000;
        if (elapsedMin > targetResolveTime) {
          totalResolveEvaluated++; // Count as breach
        }
      }
    }
  }

  const total = incidents.length;
  let score = 0;
  if (totalAckEvaluated > 0 || totalResolveEvaluated > 0) {
    const ackScore = totalAckEvaluated > 0 ? (metAck / totalAckEvaluated) * 100 : 100;
    const resolveScore =
      totalResolveEvaluated > 0 ? (metResolve / totalResolveEvaluated) * 100 : 100;
    score = (ackScore + resolveScore) / 2;
  } else if (total === 0) {
    // No incidents - this is good (100% compliance by default when no work to measure)
    score = 100;
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

  const targetAckMinutes = incident.service.targetAckMinutes || DEFAULT_ACK_TARGET_MINUTES;
  const targetResolveMinutes =
    incident.service.targetResolveMinutes || DEFAULT_RESOLVE_TARGET_MINUTES;

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
  let current = { start: sorted[0].start, end: sorted[0].end };

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
      current = { start: next.start, end: next.end };
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

  const { start: effectiveStart, end: effectiveEnd } = await getQueryDateBounds(
    startDate,
    endDate,
    'incident'
  );

  const incidents = await prisma.incident.findMany({
    where: {
      serviceId: { in: serviceIds },
      AND: [
        { createdAt: { lt: effectiveEnd } },
        {
          OR: [
            { resolvedAt: { gte: effectiveStart } },
            { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
          ],
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
  const totalMs = effectiveEnd.getTime() - effectiveStart.getTime();

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
        start: incident.createdAt > effectiveStart ? incident.createdAt : effectiveStart,
        end:
          incident.resolvedAt && incident.resolvedAt < effectiveEnd
            ? incident.resolvedAt
            : effectiveEnd,
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

/**
 * Calculate SLA metrics from pre-aggregated rollup data
 *
 * Use this for historical queries (beyond realTimeWindowDays) to avoid
 * expensive real-time calculations on large datasets.
 *
 * @param start - Start date for the query range
 * @param end - End date for the query range
 * @param filters - Optional filters for service, team
 * @returns Partial SLA metrics derived from rollups
 */
/**
 * Calculate SLA metrics from pre-aggregated rollup data
 *
 * Use this for historical queries (beyond realTimeWindowDays) to avoid
 * expensive real-time calculations on large datasets.
 *
 * @param start - Start date for the query range
 * @param end - End date for the query range
 * @param filters - Optional filters for service, team
 * @returns Full SLA metrics derived from rollups (with some fields estimated/defaulted)
 */
export async function calculateSLAMetricsFromRollups(
  start: Date,
  end: Date,
  filters: { serviceId?: string | null; teamId?: string | null } = {}
): Promise<SLAMetrics & { dataSource: 'rollup' }> {
  const { default: prisma } = await import('./prisma');

  // Need retention policy for metadata
  const retentionPolicy = await getRetentionPolicy();
  const requestedStart = start; // Simplified
  const requestedEnd = end;

  const rollups = await prisma.incidentMetricRollup.findMany({
    where: {
      date: { gte: start, lte: end },
      granularity: 'daily',
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
    },
  });

  // Aggregate all rollups
  let totalIncidents = 0;
  let openIncidents = 0;
  let acknowledgedIncidents = 0;
  let resolvedIncidents = 0;
  let mttaSum = BigInt(0);
  let mttaCount = 0;
  let mttrSum = BigInt(0);
  let mttrCount = 0;
  let ackSlaMet = 0;
  let ackSlaBreached = 0;
  let resolveSlaMet = 0;
  let resolveSlaBreached = 0;
  let escalationCount = 0;
  let reopenCount = 0;
  let autoResolveCount = 0;
  let afterHoursCount = 0;

  for (const rollup of rollups) {
    totalIncidents += rollup.totalIncidents;
    openIncidents += rollup.openIncidents;
    acknowledgedIncidents += rollup.acknowledgedIncidents;
    resolvedIncidents += rollup.resolvedIncidents;
    mttaSum += rollup.mttaSum;
    mttaCount += rollup.mttaCount;
    mttrSum += rollup.mttrSum;
    mttrCount += rollup.mttrCount;
    ackSlaMet += rollup.ackSlaMet;
    ackSlaBreached += rollup.ackSlaBreached;
    resolveSlaMet += rollup.resolveSlaMet;
    resolveSlaBreached += rollup.resolveSlaBreached;
    escalationCount += rollup.escalationCount;
    reopenCount += rollup.reopenCount;
    autoResolveCount += rollup.autoResolveCount;
    afterHoursCount += rollup.afterHoursCount;
  }

  // Calculate averages (convert from ms to minutes)
  const avgMtta = mttaCount > 0 ? Number(mttaSum / BigInt(mttaCount)) / 60000 : null;
  const avgMttr = mttrCount > 0 ? Number(mttrSum / BigInt(mttrCount)) / 60000 : null;

  // Calculate compliance rates
  const totalAckEvaluated = ackSlaMet + ackSlaBreached;
  const ackCompliance = totalAckEvaluated > 0 ? (ackSlaMet / totalAckEvaluated) * 100 : 0;

  const totalResolveEvaluated = resolveSlaMet + resolveSlaBreached;
  const resolveCompliance =
    totalResolveEvaluated > 0 ? (resolveSlaMet / totalResolveEvaluated) * 100 : 0;

  // Calculate rates
  const afterHoursRate = totalIncidents > 0 ? (afterHoursCount / totalIncidents) * 100 : 0;
  const escalationRate = totalIncidents > 0 ? (escalationCount / totalIncidents) * 100 : 0;
  const reopenRate = totalIncidents > 0 ? (reopenCount / totalIncidents) * 100 : 0;
  const autoResolveRate = totalIncidents > 0 ? (autoResolveCount / totalIncidents) * 100 : 0;

  const actualWindowMs = end.getTime() - start.getTime();
  const actualWindowDays = Math.max(1, Math.ceil(actualWindowMs / (24 * 60 * 60 * 1000)));

  logger.info('[SLA] Calculated metrics from rollups', {
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    rollupCount: rollups.length,
    totalIncidents,
  });

  // Construct full SLAMetrics object with defaults for missing granular data
  return {
    dataSource: 'rollup',

    // Retention Metadata
    effectiveStart: start,
    effectiveEnd: end,
    requestedStart: start,
    requestedEnd: end,
    isClipped: false,
    retentionDays: retentionPolicy.incidentRetentionDays,

    // Core Metrics
    totalIncidents,
    activeIncidents: openIncidents + acknowledgedIncidents,
    openCount: openIncidents,
    acknowledgedCount: acknowledgedIncidents,
    resolved24h: 0, // Not available in rollups
    unassignedActive: 0, // Not available
    highUrgencyCount: 0, // Not available
    alertsCount: 0, // Not available
    snoozedCount: 0, // Not available
    suppressedCount: 0, // Not available
    activeCount: openIncidents + acknowledgedIncidents,
    criticalCount: 0,

    // Lifecycle
    mttr: avgMttr,
    mttd: null, // Not tracked in rollups
    mtti: null, // Not tracked
    mttk: null, // Not tracked
    mttaP50: avgMtta, // Approximation using avg
    mttaP95: avgMtta, // Approximation
    mttrP50: avgMttr, // Approximation
    mttrP95: avgMttr, // Approximation
    mtbfMs: null,

    // Compliance
    ackCompliance,
    resolveCompliance,
    ackBreaches: ackSlaBreached,
    resolveBreaches: resolveSlaBreached,

    // Rates
    ackRate: 0, // Not explicitly tracked
    resolveRate: 0, // Not explicitly tracked
    highUrgencyRate: 0,
    afterHoursRate,
    alertsPerIncident: 0,
    escalationRate,
    reopenRate,
    autoResolveRate,

    dynamicStatus: 'OPERATIONAL', // Default

    // Coverage
    coveragePercent: 100,
    coverageGapDays: 0,
    onCallHoursMs: 0,
    onCallUsersCount: 0,
    activeOverrides: 0,

    // Events
    autoResolvedCount: autoResolveCount,
    manualResolvedCount: resolvedIncidents - autoResolveCount,
    eventsCount: 0,

    // Golden Signals
    avgLatencyP99: null,
    errorRate: null,
    totalRequests: 0,
    saturation: null,

    // Complex Objects (Defaults/Empty)
    previousPeriod: {
      totalIncidents: 0,
      highUrgencyCount: 0,
      mtta: null,
      mttr: null,
      ackRate: 0,
      resolveRate: 0,
    },

    trendSeries: [],
    statusMix: [],
    urgencyMix: [],
    topServices: [],
    assigneeLoad: [],
    statusAges: [],
    onCallLoad: [],
    serviceSlaTable: [],

    recurringTitles: [],
    eventsPerIncident: 0,
    heatmapData: [],
    serviceMetrics: [],
    insights: [],
    currentShifts: [],
    recentIncidents: [], // Do not return incidents for historical rollup queries
  };
}
