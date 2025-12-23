import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import MetricCard from '@/components/analytics/MetricCard';
import ChartCard from '@/components/analytics/ChartCard';
import AnalyticsFilters from '@/components/analytics/AnalyticsFilters';
import BarChart from '@/components/analytics/BarChart';
import MetricIcon from '@/components/analytics/MetricIcon';
import ProgressBar from '@/components/analytics/ProgressBar';
import PieChart from '@/components/analytics/PieChart';
import GaugeChart from '@/components/analytics/GaugeChart';
import FilterChips from '@/components/analytics/FilterChips';

const formatMinutes = (ms: number | null) => (ms === null ? '--' : `${(ms / 1000 / 60).toFixed(1)}m`);
const formatPercent = (value: number) => `${value.toFixed(0)}%`;
const formatHours = (ms: number) => `${(ms / 1000 / 60 / 60).toFixed(1)}h`;
const formatRatio = (value: number) => `${value.toFixed(1)}x`;
const formatHoursCompact = (ms: number) => `${(ms / 1000 / 60 / 60).toFixed(2)}h`;
const defaultAckTargetMinutes = 15;
const defaultResolveTargetMinutes = 120;

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        'OPEN': '#dc2626',
        'ACKNOWLEDGED': '#2563eb',
        'SNOOZED': '#ca8a04',
        'SUPPRESSED': '#7c3aed',
        'RESOLVED': '#16a34a'
    };
    return colors[status] || '#6b7280';
}

function getMetricTooltip(label: string): string {
    const tooltips: Record<string, string> = {
        'Incidents in view': 'Total number of incidents matching your current filters',
        'Incidents': 'Number of new incidents created in the selected time window',
        'MTTA': 'Mean Time to Acknowledge - Average time from incident creation to acknowledgment',
        'MTTR': 'Mean Time to Resolve - Average time from incident creation to resolution',
        'Ack rate': 'Percentage of incidents that were acknowledged',
        'Resolve rate': 'Percentage of incidents that were resolved',
        'Ack SLA met': 'Percentage of acknowledged incidents that met the SLA target time',
        'Resolve SLA met': 'Percentage of resolved incidents that met the SLA target time',
        'High urgency': 'Percentage of incidents marked as HIGH urgency',
        'Alerts': 'Total number of alerts received in the time window',
        'Alerts per incident': 'Average number of alerts per incident (noise indicator)',
        'Unassigned active': 'Number of active incidents without an assignee',
        'MTBF': 'Mean Time Between Failures - Average time between incident occurrences',
        'After-hours': 'Percentage of incidents created outside business hours (8 AM - 6 PM)',
        'Coverage': 'Percentage of days in the next 14 days with on-call coverage scheduled',
        'On-call hours': 'Total scheduled on-call hours in the next 14 days'
    };
    
    for (const [key, value] of Object.entries(tooltips)) {
        if (label.includes(key)) {
            return value;
        }
    }
    return 'Analytics metric';
}

function startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function percentile(values: number[], percentileValue: number) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
    return sorted[index];
}

function isAfterHours(date: Date) {
    const day = date.getDay();
    const hour = date.getHours();
    const isWeekend = day === 0 || day === 6;
    const isBusinessHours = hour >= 8 && hour < 18;
    return isWeekend || !isBusinessHours;
}

type SearchParams = {
    service?: string;
    team?: string;
    assignee?: string;
    status?: string;
    urgency?: string;
    window?: string;
};

const allowedStatus = ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED', 'RESOLVED'] as const;
const allowedUrgency = ['HIGH', 'LOW'] as const;
const allowedWindows = new Set([1, 3, 7, 14, 30, 60, 90]);

export default async function AnalyticsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
    const awaitedSearchParams = await searchParams;
    const teamId = typeof awaitedSearchParams?.team === 'string' && awaitedSearchParams.team !== 'ALL'
        ? awaitedSearchParams.team
        : null;
    const serviceId = typeof awaitedSearchParams?.service === 'string' && awaitedSearchParams.service !== 'ALL'
        ? awaitedSearchParams.service
        : null;
    const assigneeId = typeof awaitedSearchParams?.assignee === 'string' && awaitedSearchParams.assignee !== 'ALL'
        ? awaitedSearchParams.assignee
        : null;
    const statusFilter: (typeof allowedStatus)[number] | 'ALL' = allowedStatus.includes(awaitedSearchParams?.status as any)
        ? (awaitedSearchParams?.status as (typeof allowedStatus)[number])
        : 'ALL';
    const urgencyFilter: (typeof allowedUrgency)[number] | 'ALL' = allowedUrgency.includes(awaitedSearchParams?.urgency as any)
        ? (awaitedSearchParams?.urgency as (typeof allowedUrgency)[number])
        : 'ALL';
    const windowCandidate = Number(awaitedSearchParams?.window ?? 7);
    const windowDays = allowedWindows.has(windowCandidate) ? windowCandidate : 7;

    const now = new Date();
    const recentWindowDays = windowDays;
    const trendWindowDays = windowDays;
    const serviceWindowDays = windowDays;
    const coverageWindowDays = 14;

    const recentStart = new Date(now);
    recentStart.setDate(now.getDate() - recentWindowDays);
    const trendStart = new Date(now);
    trendStart.setDate(now.getDate() - (trendWindowDays - 1));
    const serviceStart = new Date(now);
    serviceStart.setDate(now.getDate() - serviceWindowDays);

    const coverageWindowEnd = new Date(now);
    coverageWindowEnd.setDate(now.getDate() + coverageWindowDays);

    const teamServiceIds = teamId
        ? await prisma.service.findMany({
            where: { teamId },
            select: { id: true }
        })
        : null;

    const teamServiceIdList = teamServiceIds?.map((service) => service.id) ?? null;

    const statusValue = statusFilter !== 'ALL' ? (statusFilter as (typeof allowedStatus)[number]) : null;
    const urgencyValue = urgencyFilter !== 'ALL' ? (urgencyFilter as (typeof allowedUrgency)[number]) : null;
    const statusWhere = statusValue ? { status: statusValue } : null;
    const urgencyWhere = urgencyValue ? { urgency: urgencyValue } : null;
    const serviceWhere = serviceId
        ? { serviceId }
        : teamServiceIdList
            ? { serviceId: { in: teamServiceIdList } }
            : null;
    const assigneeWhere = assigneeId ? { assigneeId } : null;

    const activeStatusWhere = statusValue ? { status: statusValue } : { status: { not: 'RESOLVED' as const } };
    const activeWhere: Prisma.IncidentWhereInput = {
        ...activeStatusWhere,
        ...(serviceWhere ?? {}),
        ...(urgencyWhere ?? {}),
        ...(assigneeWhere ?? {})
    };

    const recentIncidentWhere = {
        createdAt: { gte: recentStart },
        ...(serviceWhere ?? {}),
        ...(urgencyWhere ?? {}),
        ...(statusWhere ?? {}),
        ...(assigneeWhere ?? {})
    };

    const trendIncidentWhere = {
        createdAt: { gte: trendStart },
        ...(serviceWhere ?? {}),
        ...(urgencyWhere ?? {}),
        ...(statusWhere ?? {}),
        ...(assigneeWhere ?? {})
    };

    const topServiceWhere = {
        createdAt: { gte: serviceStart },
        ...(urgencyWhere ?? {}),
        ...(statusWhere ?? {}),
        ...(assigneeWhere ?? {})
    };

    const [
        activeIncidents,
        unassignedActive,
        recentIncidents,
        incidentsTrend,
        alertsLastWeek,
        futureShifts,
        windowShifts,
        activeOverrides,
        statusTrends,
        services,
        topServiceCounts,
        assigneeCounts,
        recurringTitles,
        teams,
        users
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
                service: {
                    select: {
                        targetAckMinutes: true,
                        targetResolveMinutes: true
                    }
                }
            }
        }),
        prisma.incident.findMany({
            where: trendIncidentWhere,
            select: { createdAt: true }
        }),
        prisma.alert.count({
            where: {
                createdAt: { gte: recentStart },
                ...(serviceWhere ?? {})
            }
        }),
        prisma.onCallShift.findMany({
            where: { end: { gte: now }, start: { lte: coverageWindowEnd } },
            select: { start: true, end: true, userId: true }
        }),
        prisma.onCallShift.findMany({
            where: { end: { gte: recentStart }, start: { lte: now } },
            select: { start: true, end: true, userId: true }
        }),
        prisma.onCallOverride.count({ where: { end: { gte: now } } }),
        prisma.incident.groupBy({
            by: ['status'],
            where: recentIncidentWhere,
            _count: { _all: true }
        }),
        prisma.service.findMany({
            select: { id: true, name: true, teamId: true, targetAckMinutes: true, targetResolveMinutes: true }
        }),
        prisma.incident.groupBy({
            by: ['serviceId'],
            where: {
                ...topServiceWhere,
                ...(serviceWhere ?? {})
            },
            _count: { _all: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        }),
        prisma.incident.groupBy({
            by: ['assigneeId'],
            where: {
                ...recentIncidentWhere,
                assigneeId: { not: null }
            },
            _count: { _all: true },
            orderBy: { _count: { id: 'desc' } },
            take: 6
        }),
        prisma.incident.groupBy({
            by: ['title'],
            where: recentIncidentWhere,
            _count: { _all: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        }),
        prisma.team.findMany({
            select: { id: true, name: true }
        }),
        prisma.user.findMany({
            select: { id: true, name: true, email: true }
        })
    ]);

    const recentIncidentIds = recentIncidents.map((incident) => incident.id);
    const eventsLastWeek = recentIncidentIds.length
        ? await prisma.incidentEvent.count({
            where: {
                createdAt: { gte: recentStart },
                incidentId: { in: recentIncidentIds }
            }
        })
        : 0;
    const [ackEvents, autoResolveEvents, escalationEvents, reopenEvents] = recentIncidentIds.length
        ? await Promise.all([
            prisma.incidentEvent.findMany({
                where: {
                    createdAt: { gte: recentStart },
                    incidentId: { in: recentIncidentIds },
                    message: { contains: 'acknowledged', mode: 'insensitive' }
                },
                select: { incidentId: true, createdAt: true },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.incidentEvent.findMany({
                where: {
                    createdAt: { gte: recentStart },
                    incidentId: { in: recentIncidentIds },
                    message: { contains: 'auto-resolved', mode: 'insensitive' }
                },
                select: { incidentId: true }
            }),
            prisma.incidentEvent.findMany({
                where: {
                    createdAt: { gte: recentStart },
                    incidentId: { in: recentIncidentIds },
                    message: { contains: 'escalated to', mode: 'insensitive' }
                },
                select: { incidentId: true }
            }),
            prisma.incidentEvent.findMany({
                where: {
                    createdAt: { gte: recentStart },
                    incidentId: { in: recentIncidentIds },
                    message: { contains: 'reopen', mode: 'insensitive' }
                },
                select: { incidentId: true }
            })
        ])
        : [[], [], [], []];

    // Use acknowledgedAt field if available, fallback to event parsing for backward compatibility
    const ackByIncident = new Map<string, Date>();
    for (const incident of recentIncidents) {
        if (incident.acknowledgedAt) {
            ackByIncident.set(incident.id, incident.acknowledgedAt);
        }
    }
    // Fallback to event parsing for incidents without acknowledgedAt
    for (const ack of ackEvents) {
        if (!ackByIncident.has(ack.incidentId)) {
            ackByIncident.set(ack.incidentId, ack.createdAt);
        }
    }

    const ackDiffs: number[] = [];
    for (const incident of recentIncidents) {
        const ackedAt = ackByIncident.get(incident.id);
        if (ackedAt && incident.createdAt) {
            ackDiffs.push(ackedAt.getTime() - incident.createdAt.getTime());
        }
    }
    const mttaMs = ackDiffs.length ? ackDiffs.reduce((sum, diff) => sum + diff, 0) / ackDiffs.length : null;
    const mttaP50 = percentile(ackDiffs, 50);
    const mttaP95 = percentile(ackDiffs, 95);

    const resolvedIncidents = recentIncidents.filter((incident) => incident.status === 'RESOLVED');
    const resolvedDiffs = resolvedIncidents.map((incident) => {
        // Use resolvedAt field if available, fallback to updatedAt
        const resolvedAt = incident.resolvedAt || incident.updatedAt;
        if (resolvedAt && incident.createdAt) {
            return resolvedAt.getTime() - incident.createdAt.getTime();
        }
        return null;
    }).filter((diff): diff is number => diff !== null);
    const mttrMs = resolvedDiffs.length ? resolvedDiffs.reduce((sum, diff) => sum + diff, 0) / resolvedDiffs.length : null;
    const mttrP50 = percentile(resolvedDiffs, 50);
    const mttrP95 = percentile(resolvedDiffs, 95);

    const totalRecent = recentIncidents.length;
    const highUrgencyCount = recentIncidents.filter((incident) => incident.urgency === 'HIGH').length;
    const lowUrgencyCount = Math.max(0, totalRecent - highUrgencyCount);
    const ackedIncidents = ackByIncident.size;
    const resolutionRate = totalRecent ? (resolvedIncidents.length / totalRecent) * 100 : 0;
    const ackRate = totalRecent ? (ackedIncidents / totalRecent) * 100 : 0;
    const highUrgencyRate = totalRecent ? (highUrgencyCount / totalRecent) * 100 : 0;
    const alertsPerIncident = totalRecent ? alertsLastWeek / totalRecent : 0;

    const coverageDays = new Set<string>();
    let totalShiftMs = 0;
    const onCallUsers = new Set<string>();
    for (const shift of futureShifts) {
        const shiftStart = shift.start < now ? now : shift.start;
        const shiftEnd = shift.end > coverageWindowEnd ? coverageWindowEnd : shift.end;
        if (shiftEnd <= shiftStart) {
            continue;
        }
        totalShiftMs += shiftEnd.getTime() - shiftStart.getTime();
        onCallUsers.add(shift.userId);
        let cursor = new Date(shiftStart);
        while (cursor <= shiftEnd) {
            coverageDays.add(cursor.toDateString());
            cursor.setDate(cursor.getDate() + 1);
        }
    }
    const coveragePercent = Math.min(100, (coverageDays.size / coverageWindowDays) * 100);
    const coverageGapDays = Math.max(0, coverageWindowDays - coverageDays.size);

    const afterHoursCount = recentIncidents.filter((incident) => isAfterHours(incident.createdAt)).length;
    const afterHoursRate = totalRecent ? (afterHoursCount / totalRecent) * 100 : 0;

    const sortedTrend = incidentsTrend
        .map((entry) => entry.createdAt)
        .sort((a, b) => a.getTime() - b.getTime());
    const mtbfDiffs: number[] = [];
    for (let i = 1; i < sortedTrend.length; i += 1) {
        mtbfDiffs.push(sortedTrend[i].getTime() - sortedTrend[i - 1].getTime());
    }
    const mtbfMs = mtbfDiffs.length ? mtbfDiffs.reduce((sum, diff) => sum + diff, 0) / mtbfDiffs.length : null;

    const trendStartDay = startOfDay(trendStart);
    const trendSeries = Array.from({ length: trendWindowDays }, (_, index) => {
        const day = new Date(trendStartDay);
        day.setDate(trendStartDay.getDate() + index);
        return { date: day, key: toDateKey(day), label: formatDayLabel(day), count: 0 };
    });
    const trendIndex = new Map(trendSeries.map((entry, index) => [entry.key, index]));
    for (const incident of incidentsTrend) {
        const key = toDateKey(startOfDay(incident.createdAt));
        const index = trendIndex.get(key);
        if (index !== undefined) {
            trendSeries[index].count += 1;
        }
    }
    const maxTrend = Math.max(1, ...trendSeries.map((entry) => entry.count));

    const statusOrder: Array<(typeof allowedStatus)[number]> = ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED', 'RESOLVED'];
    const statusMap = new Map(statusTrends.map((entry) => [entry.status, entry._count._all]));
    const statusMix = statusOrder.map((status) => ({
        status,
        count: statusMap.get(status) ?? 0
    }));

    const serviceNameMap = new Map(services.map((service) => [service.id, service.name]));
    const serviceTargetMap = new Map(
        services.map((service) => [
            service.id,
            {
                ackMinutes: service.targetAckMinutes ?? defaultAckTargetMinutes,
                resolveMinutes: service.targetResolveMinutes ?? defaultResolveTargetMinutes
            }
        ])
    );
    const topServices = topServiceCounts.map((entry) => ({
        id: entry.serviceId,
        name: serviceNameMap.get(entry.serviceId) || 'Deleted service',
        count: entry._count._all
    }));

    const servicesForFilter = teamId
        ? services.filter((service) => service.teamId === teamId)
        : services;

    const assigneeIds = assigneeCounts
        .map((entry) => entry.assigneeId)
        .filter((id): id is string => Boolean(id));
    const onCallUserIds = Array.from(new Set(windowShifts.map((shift) => shift.userId)));
    const usersById = assigneeIds.length || onCallUserIds.length
        ? await prisma.user.findMany({
            where: { id: { in: Array.from(new Set([...assigneeIds, ...onCallUserIds])) } },
            select: { id: true, name: true, email: true }
        })
        : [];
    const userNameMap = new Map(usersById.map((user) => [user.id, user.name || user.email || 'Unknown user']));
    const filterUserNameMap = new Map(users.map((user) => [user.id, user.name || user.email || 'Unknown user']));

    const assigneeLoad = assigneeCounts.map((entry) => ({
        id: entry.assigneeId as string,
        name: userNameMap.get(entry.assigneeId as string) || 'Unknown user',
        count: entry._count._all
    }));

    const onCallLoadMap = new Map<string, { hoursMs: number; incidentCount: number }>();
    for (const shift of windowShifts) {
        const shiftStart = shift.start < recentStart ? recentStart : shift.start;
        const shiftEnd = shift.end > now ? now : shift.end;
        if (shiftEnd <= shiftStart) {
            continue;
        }
        const entry = onCallLoadMap.get(shift.userId) || { hoursMs: 0, incidentCount: 0 };
        entry.hoursMs += shiftEnd.getTime() - shiftStart.getTime();
        onCallLoadMap.set(shift.userId, entry);
    }
    for (const incident of recentIncidents) {
        for (const shift of windowShifts) {
            if (incident.createdAt >= shift.start && incident.createdAt <= shift.end) {
                const entry = onCallLoadMap.get(shift.userId) || { hoursMs: 0, incidentCount: 0 };
                entry.incidentCount += 1;
                onCallLoadMap.set(shift.userId, entry);
            }
        }
    }
    const onCallLoad = Array.from(onCallLoadMap.entries())
        .map(([userId, stats]) => ({
            id: userId,
            name: userNameMap.get(userId) || 'Unknown user',
            hoursMs: stats.hoursMs,
            incidentCount: stats.incidentCount
        }))
        .sort((a, b) => b.incidentCount - a.incidentCount)
        .slice(0, 6);

    const statusAgeMap = new Map<string, { totalMs: number; count: number }>();
    for (const incident of recentIncidents) {
        const durationMs = incident.status === 'RESOLVED' && incident.updatedAt
            ? incident.updatedAt.getTime() - incident.createdAt.getTime()
            : now.getTime() - incident.createdAt.getTime();
        const current = statusAgeMap.get(incident.status) || { totalMs: 0, count: 0 };
        current.totalMs += durationMs;
        current.count += 1;
        statusAgeMap.set(incident.status, current);
    }
    const statusAges = statusOrder.map((status) => {
        const data = statusAgeMap.get(status);
        const avgMs = data && data.count ? data.totalMs / data.count : null;
        return { status, avgMs };
    });

    const serviceSlaStats = new Map<string, { ackMet: number; ackTotal: number; resolveMet: number; resolveTotal: number }>();
    for (const incident of recentIncidents) {
        const targets = serviceTargetMap.get(incident.serviceId);
        const ackTargetMinutes = targets?.ackMinutes ?? defaultAckTargetMinutes;
        const resolveTargetMinutes = targets?.resolveMinutes ?? defaultResolveTargetMinutes;
        const current = serviceSlaStats.get(incident.serviceId) || { ackMet: 0, ackTotal: 0, resolveMet: 0, resolveTotal: 0 };

        const ackedAt = ackByIncident.get(incident.id);
        if (ackedAt && incident.createdAt) {
            current.ackTotal += 1;
            const diffMinutes = (ackedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
            if (diffMinutes <= ackTargetMinutes) {
                current.ackMet += 1;
            }
        }

        if (incident.status === 'RESOLVED') {
            const resolvedAt = incident.resolvedAt || incident.updatedAt;
            if (resolvedAt && incident.createdAt) {
                current.resolveTotal += 1;
                const diffMinutes = (resolvedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
                if (diffMinutes <= resolveTargetMinutes) {
                    current.resolveMet += 1;
                }
            }
        }

        serviceSlaStats.set(incident.serviceId, current);
    }

    const serviceSlaTable = Array.from(serviceSlaStats.entries())
        .map(([serviceIdKey, stats]) => ({
            id: serviceIdKey,
            name: serviceNameMap.get(serviceIdKey) || 'Deleted service',
            ackRate: stats.ackTotal ? (stats.ackMet / stats.ackTotal) * 100 : 0,
            resolveRate: stats.resolveTotal ? (stats.resolveMet / stats.resolveTotal) * 100 : 0,
            total: Math.max(stats.ackTotal, stats.resolveTotal)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

    let ackSlaMet = 0;
    let resolveSlaMet = 0;
    for (const incident of recentIncidents) {
        const targets = serviceTargetMap.get(incident.serviceId);
        const ackTargetMinutes = targets?.ackMinutes ?? defaultAckTargetMinutes;
        const resolveTargetMinutes = targets?.resolveMinutes ?? defaultResolveTargetMinutes;

        const ackedAt = ackByIncident.get(incident.id);
        if (ackedAt && incident.createdAt) {
            const diffMinutes = (ackedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
            if (diffMinutes <= ackTargetMinutes) {
                ackSlaMet += 1;
            }
        }

        if (incident.status === 'RESOLVED') {
            const resolvedAt = incident.resolvedAt || incident.updatedAt;
            if (resolvedAt && incident.createdAt) {
                const diffMinutes = (resolvedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
                if (diffMinutes <= resolveTargetMinutes) {
                    resolveSlaMet += 1;
                }
            }
        }
    }

    const ackSlaRate = ackedIncidents ? (ackSlaMet / ackedIncidents) * 100 : 0;
    const resolveSlaRate = resolvedIncidents.length ? (resolveSlaMet / resolvedIncidents.length) * 100 : 0;
    const ackSlaBreaches = Math.max(0, ackedIncidents - ackSlaMet);
    const resolveSlaBreaches = Math.max(0, resolvedIncidents.length - resolveSlaMet);
    const ackSlaBurnRate = Math.max(0, 100 - ackSlaRate);
    const resolveSlaBurnRate = Math.max(0, 100 - resolveSlaRate);

    const autoResolvedIds = new Set(autoResolveEvents.map((event) => event.incidentId));
    const escalatedIds = new Set(escalationEvents.map((event) => event.incidentId));
    const reopenedIds = new Set(reopenEvents.map((event) => event.incidentId));
    const autoResolvedCount = resolvedIncidents.filter((incident) => autoResolvedIds.has(incident.id)).length;
    const manualResolvedCount = Math.max(0, resolvedIncidents.length - autoResolvedCount);
    const autoResolvedRate = resolvedIncidents.length ? (autoResolvedCount / resolvedIncidents.length) * 100 : 0;
    const reopenCount = reopenedIds.size;
    const reopenRate = resolvedIncidents.length ? (reopenCount / resolvedIncidents.length) * 100 : 0;
    const escalationRate = totalRecent ? (escalatedIds.size / totalRecent) * 100 : 0;

    const metricCards = [
        { label: 'Incidents in view', value: activeIncidents.toLocaleString(), detail: 'Filtered set' },
        { label: `Incidents (${recentWindowDays}d)`, value: totalRecent.toLocaleString(), detail: 'New incidents' },
        { label: 'MTTA', value: formatMinutes(mttaMs), detail: `Avg ack time (${recentWindowDays}d)` },
        { label: 'MTTR', value: formatMinutes(mttrMs), detail: `Avg resolve time (${recentWindowDays}d)` },
        { label: 'Ack rate', value: formatPercent(ackRate), detail: 'Incidents acknowledged' },
        { label: 'Resolve rate', value: formatPercent(resolutionRate), detail: 'Incidents resolved' },
        { label: 'Ack SLA met', value: formatPercent(ackSlaRate), detail: 'Within target' },
        { label: 'Resolve SLA met', value: formatPercent(resolveSlaRate), detail: 'Within target' },
        { label: 'High urgency', value: formatPercent(highUrgencyRate), detail: 'Share of HIGH' },
        { label: `Alerts (${recentWindowDays}d)`, value: alertsLastWeek.toLocaleString(), detail: 'Incoming alerts' },
        { label: 'Alerts per incident', value: formatRatio(alertsPerIncident), detail: 'Alert noise' },
        { label: 'Unassigned active', value: unassignedActive.toLocaleString(), detail: 'Needs ownership' },
        { label: 'MTBF', value: mtbfMs ? formatHours(mtbfMs) : '--', detail: `Between incidents (${recentWindowDays}d)` },
        { label: 'After-hours', value: formatPercent(afterHoursRate), detail: `Outside 8-18 (${recentWindowDays}d)` },
        { label: 'Coverage', value: formatPercent(coveragePercent), detail: 'Next 14 days' },
        { label: 'On-call hours', value: formatHours(totalShiftMs), detail: 'Next 14 days' }
    ];

    // Build export URL with all filters
    const exportParams = new URLSearchParams();
    exportParams.append('format', 'csv');
    exportParams.append('window', `${windowDays}`);
    if (teamId && teamId !== 'ALL') exportParams.append('team', teamId);
    if (serviceId && serviceId !== 'ALL') exportParams.append('service', serviceId);
    if (assigneeId && assigneeId !== 'ALL') exportParams.append('assignee', assigneeId);
    if (statusFilter !== 'ALL') exportParams.append('status', statusFilter);
    if (urgencyFilter !== 'ALL') exportParams.append('urgency', urgencyFilter);
    const exportUrl = `/api/analytics/export?${exportParams.toString()}`;

    return (
        <main className="page-shell analytics-shell">
            <div className="analytics-hero-redesigned">
                <div className="analytics-hero-inner">
                    <div className="analytics-hero-left">
                        <p className="schedule-eyebrow">Analytics</p>
                        <h1>Operational Readiness</h1>
                    </div>
                    <div className="analytics-hero-right">
                        <a 
                            href={exportUrl}
                            className="analytics-export-btn"
                        >
                            <span>📥</span>
                            Export CSV
                        </a>
                    </div>
                </div>
            </div>

            <AnalyticsFilters
                teams={teams}
                services={servicesForFilter}
                users={users}
                currentFilters={{
                    team: teamId ?? 'ALL',
                    service: serviceId ?? 'ALL',
                    assignee: assigneeId ?? 'ALL',
                    status: statusFilter,
                    urgency: urgencyFilter,
                    window: `${windowDays}`
                }}
            />
            
            <FilterChips
                filters={{
                    team: teamId ?? 'ALL',
                    service: serviceId ?? 'ALL',
                    assignee: assigneeId ?? 'ALL',
                    status: statusFilter,
                    urgency: urgencyFilter,
                    window: `${windowDays}`
                }}
                teams={teams}
                services={servicesForFilter}
                users={users}
            />

            <section className="glass-panel analytics-grid">
                {metricCards.map((metric, index) => {
                    // Determine variant based on metric type with better logic
                    let variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' = 'default';
                    let showProgress = false;
                    let progressValue = 0;
                    const tooltipText = getMetricTooltip(metric.label);
                    
                    // SLA metrics - color by performance
                    if (metric.label.includes('SLA met')) {
                        const value = parseFloat(metric.value.replace(/[^0-9.]/g, ''));
                        if (!isNaN(value)) {
                            variant = value >= 95 ? 'success' : value >= 80 ? 'warning' : 'danger';
                            showProgress = true;
                            progressValue = value;
                        }
                    }
                    // Rate metrics - color by performance
                    else if (metric.label.includes('rate') && !metric.label.includes('SLA')) {
                        const value = parseFloat(metric.value.replace(/[^0-9.]/g, ''));
                        if (!isNaN(value)) {
                            if (metric.label.includes('Ack rate') || metric.label.includes('Resolve rate')) {
                                variant = value >= 80 ? 'success' : value >= 60 ? 'warning' : 'danger';
                            } else if (metric.label.includes('High urgency')) {
                                variant = value >= 50 ? 'warning' : 'default';
                            } else if (metric.label.includes('After-hours')) {
                                variant = value >= 50 ? 'warning' : 'default';
                            }
                        }
                    }
                    // Time metrics - primary color
                    else if (metric.label.includes('MTTA') || metric.label.includes('MTTR') || metric.label.includes('MTBF')) {
                        variant = 'primary';
                    }
                    // Key metrics - primary color
                    else if (index === 0 || index === 1) {
                        variant = 'primary';
                    }
                    // Coverage - success if 100%
                    else if (metric.label.includes('Coverage')) {
                        const value = parseFloat(metric.value.replace(/[^0-9.]/g, ''));
                        if (!isNaN(value)) {
                            variant = value >= 100 ? 'success' : value >= 80 ? 'warning' : 'danger';
                            showProgress = true;
                            progressValue = value;
                        }
                    }
                    // Unassigned - danger if high
                    else if (metric.label.includes('Unassigned')) {
                        const value = parseFloat(metric.value.replace(/[^0-9.]/g, ''));
                        if (!isNaN(value)) {
                            variant = value > 0 ? 'warning' : 'success';
                        }
                    }

                    return (
                        <MetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            detail={metric.detail}
                            variant={variant}
                            icon={<MetricIcon type={metric.label} />}
                            tooltip={tooltipText}
                        >
                            {showProgress && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <ProgressBar 
                                        value={progressValue} 
                                        variant={variant === 'success' ? 'success' : variant === 'warning' ? 'warning' : variant === 'danger' ? 'danger' : 'primary'}
                                        size="sm"
                                    />
                                </div>
                            )}
                        </MetricCard>
                    );
                })}
            </section>

            <section className="glass-panel analytics-charts">
                <ChartCard title={`Incident volume (last ${trendWindowDays} days)`}>
                    <BarChart
                        data={trendSeries.map(entry => ({ key: entry.key, label: entry.label, count: entry.count }))}
                        maxValue={maxTrend}
                        height={180}
                    />
                </ChartCard>
                <ChartCard title={`Incident status mix (${recentWindowDays}d)`}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
                        <PieChart 
                            data={statusMix.map(entry => ({
                                label: entry.status,
                                value: entry.count,
                                color: getStatusColor(entry.status)
                            }))}
                            size={140}
                            showLegend={false}
                        />
                        <div className="analytics-list">
                            {statusMix.map((entry) => (
                                <div key={entry.status} className={`analytics-list-item-enhanced analytics-status-${entry.status.toLowerCase()}`}>
                                    <span className="analytics-status-badge">{entry.status}</span>
                                    <strong>{entry.count}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>
                <ChartCard title={`Top noisy services (${serviceWindowDays}d)`}>
                    <div className="analytics-list">
                        {topServices.length === 0 ? (
                            <div className="analytics-empty-state">
                                <div className="analytics-empty-icon">📊</div>
                                <div className="analytics-empty-title">No incidents found</div>
                                <div className="analytics-empty-description">No incidents in the last {serviceWindowDays} days for the selected filters.</div>
                            </div>
                        ) : topServices.map((service, index) => {
                            const percentage = totalRecent > 0 ? (service.count / totalRecent) * 100 : 0;
                            return (
                                <div key={service.id} className="analytics-list-item-enhanced">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            fontWeight: '700', 
                                            color: 'var(--text-muted)',
                                            minWidth: '20px'
                                        }}>#{index + 1}</span>
                                        <span>{service.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {percentage.toFixed(1)}%
                                        </span>
                                        <strong>{service.count}</strong>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ChartCard>
                <ChartCard title={`Urgency mix (${recentWindowDays}d)`}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
                        <PieChart 
                            data={[
                                { label: 'HIGH', value: highUrgencyCount, color: '#dc2626' },
                                { label: 'LOW', value: lowUrgencyCount, color: '#6b7280' }
                            ]}
                            size={140}
                            showLegend={false}
                        />
                        <div className="analytics-list">
                            <div className="analytics-list-item-enhanced analytics-urgency-high">
                                <span className="analytics-urgency-badge">HIGH</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {totalRecent > 0 ? ((highUrgencyCount / totalRecent) * 100).toFixed(1) : 0}%
                                    </span>
                                    <strong>{highUrgencyCount}</strong>
                                </div>
                            </div>
                            <div className="analytics-list-item-enhanced analytics-urgency-low">
                                <span className="analytics-urgency-badge">LOW</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {totalRecent > 0 ? ((lowUrgencyCount / totalRecent) * 100).toFixed(1) : 0}%
                                    </span>
                                    <strong>{lowUrgencyCount}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </ChartCard>
            </section>

            <section className="analytics-split">
                <div className="glass-panel analytics-section-enhanced">
                    <h2>Response health</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <GaugeChart 
                                value={ackSlaRate} 
                                label="Ack SLA"
                                thresholds={{ good: 95, warning: 80 }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <GaugeChart 
                                value={resolveSlaRate} 
                                label="Resolve SLA"
                                thresholds={{ good: 95, warning: 80 }}
                            />
                        </div>
                    </div>
                    <div className="analytics-kpi-row">
                        <div className="analytics-kpi">
                            <span>Avg ack time</span>
                            <strong>{formatMinutes(mttaMs)}</strong>
                        </div>
                        <div className="analytics-kpi">
                            <span>Avg resolve time</span>
                            <strong>{formatMinutes(mttrMs)}</strong>
                        </div>
                        <div className="analytics-kpi">
                            <span>Acked incidents</span>
                            <strong>{formatPercent(ackRate)}</strong>
                        </div>
                        <div className="analytics-kpi">
                            <span>Resolved incidents</span>
                            <strong>{formatPercent(resolutionRate)}</strong>
                        </div>
                    </div>
                    <div className="analytics-table">
                        <div className="analytics-table-row">
                            <span>MTTA p50</span>
                            <strong>{mttaP50 === null ? '--' : formatMinutes(mttaP50)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>MTTA p95</span>
                            <strong>{mttaP95 === null ? '--' : formatMinutes(mttaP95)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>MTTR p50</span>
                            <strong>{mttrP50 === null ? '--' : formatMinutes(mttrP50)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>MTTR p95</span>
                            <strong>{mttrP95 === null ? '--' : formatMinutes(mttrP95)}</strong>
                        </div>
                    </div>
                    <div className="analytics-table">
                        <div className="analytics-table-row">
                            <span>High urgency share ({recentWindowDays}d)</span>
                            <strong>{formatPercent(highUrgencyRate)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Ack SLA breaches ({recentWindowDays}d)</span>
                            <strong>{ackSlaBreaches.toLocaleString()}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Resolve SLA breaches ({recentWindowDays}d)</span>
                            <strong>{resolveSlaBreaches.toLocaleString()}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Unassigned active incidents</span>
                            <strong>{unassignedActive.toLocaleString()}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Incident events logged ({recentWindowDays}d)</span>
                            <strong>{eventsLastWeek.toLocaleString()}</strong>
                        </div>
                    </div>
                </div>

                <div className="glass-panel analytics-section-enhanced">
                    <h2>Coverage outlook</h2>
                    <div className="analytics-table">
                        <div className="analytics-table-row">
                            <span>Coverage next {coverageWindowDays} days</span>
                            <strong>{formatPercent(coveragePercent)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Coverage gap days</span>
                            <strong>{coverageGapDays.toLocaleString()}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Scheduled on-call hours</span>
                            <strong>{formatHours(totalShiftMs)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Unique responders scheduled</span>
                            <strong>{onCallUsers.size.toLocaleString()}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Active overrides</span>
                            <strong>{activeOverrides.toLocaleString()}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="glass-panel analytics-section-enhanced">
                <h2>SLA compliance by service</h2>
                <div className="analytics-table">
                    {serviceSlaTable.length === 0 ? (
                        <div className="analytics-empty-state">
                            <div className="analytics-empty-icon">🎯</div>
                            <div className="analytics-empty-title">No SLA data</div>
                            <div className="analytics-empty-description">No SLA compliance data available in this time window.</div>
                        </div>
                    ) : serviceSlaTable.map((entry) => (
                        <div key={entry.id} className="analytics-table-row">
                            <span>{entry.name}</span>
                            <strong>Ack {formatPercent(entry.ackRate)} · Resolve {formatPercent(entry.resolveRate)}</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className="analytics-split">
                <div className="glass-panel analytics-section-enhanced">
                    <h2>Reliability signals</h2>
                    <div className="analytics-table">
                        <div className="analytics-table-row">
                            <span>MTBF</span>
                            <strong>{mtbfMs ? formatHours(mtbfMs) : '--'}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>After-hours incidents</span>
                            <strong>{afterHoursCount.toLocaleString()}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Escalation rate</span>
                            <strong>{formatPercent(escalationRate)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Reopen rate</span>
                            <strong>{formatPercent(reopenRate)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Auto-resolved share</span>
                            <strong>{formatPercent(autoResolvedRate)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Manual resolved</span>
                            <strong>{manualResolvedCount.toLocaleString()}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Ack SLA burn</span>
                            <strong>{formatPercent(ackSlaBurnRate)}</strong>
                        </div>
                        <div className="analytics-table-row">
                            <span>Resolve SLA burn</span>
                            <strong>{formatPercent(resolveSlaBurnRate)}</strong>
                        </div>
                    </div>
                </div>

                <div className="glass-panel analytics-section-enhanced">
                    <h2>State age breakdown</h2>
                    <div className="analytics-list">
                        {statusAges.map((entry) => (
                            <div key={entry.status} className={`analytics-list-item-enhanced analytics-status-${entry.status.toLowerCase()}`}>
                                <span className="analytics-status-badge">{entry.status}</span>
                                <strong>{entry.avgMs === null ? '--' : formatHoursCompact(entry.avgMs)}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="glass-panel analytics-section-enhanced">
                <h2>Ownership & on-call load</h2>
                <div className="analytics-columns">
                    <div>
                        <p className="analytics-subtitle">Assignee load</p>
                        <div className="analytics-list">
                            {assigneeLoad.length === 0 ? (
                                <div className="analytics-empty-state">
                                    <div className="analytics-empty-icon">👤</div>
                                    <div className="analytics-empty-title">No assignee data</div>
                                    <div className="analytics-empty-description">No assignee data available in this time window.</div>
                                </div>
                            ) : assigneeLoad.map((entry) => (
                                <div key={entry.id} className="analytics-list-item">
                                    <span>{entry.name}</span>
                                    <strong>{entry.count}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="analytics-subtitle">On-call load</p>
                        <div className="analytics-list">
                            {onCallLoad.length === 0 ? (
                                <div className="analytics-empty-state">
                                    <div className="analytics-empty-icon">👥</div>
                                    <div className="analytics-empty-title">No on-call shifts</div>
                                    <div className="analytics-empty-description">No on-call shifts scheduled in this time window.</div>
                                </div>
                            ) : onCallLoad.map((entry) => (
                                <div key={entry.id} className="analytics-list-item">
                                    <span>{entry.name}</span>
                                    <strong>{entry.incidentCount} incidents · {formatHoursCompact(entry.hoursMs)}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="glass-panel analytics-section-enhanced">
                <h2>Top recurring incident titles</h2>
                <div className="analytics-list">
                    {recurringTitles.length === 0 ? (
                        <div className="analytics-empty-state">
                            <div className="analytics-empty-icon">🔄</div>
                            <div className="analytics-empty-title">No recurring incidents</div>
                            <div className="analytics-empty-description">No recurring incident patterns found in this time window.</div>
                        </div>
                    ) : recurringTitles.map((entry) => (
                        <div key={entry.title} className="analytics-list-item">
                            <span>{entry.title}</span>
                            <strong>{entry._count._all}</strong>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
