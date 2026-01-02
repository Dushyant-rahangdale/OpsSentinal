export type StatusAgeEntry = { status: string; avgMs: number | null };

export type OnCallShift = {
    start: Date;
    end: Date;
    userId: string;
};

export type OnCallLoadEntry = {
    id: string;
    name: string;
    hoursMs: number;
    incidentCount: number;
};

export type ServiceSlaEntry = {
    id: string;
    name: string;
    ackRate: number;
    resolveRate: number;
    total: number;
};

export function calculatePercentile(values: number[], percentileValue: number): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
    return sorted[index];
}

export function calculateMtbfMs(dates: Date[]): number | null {
    if (dates.length < 2) return null;
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    let sum = 0;
    let count = 0;
    for (let i = 1; i < sorted.length; i += 1) {
        sum += sorted[i].getTime() - sorted[i - 1].getTime();
        count += 1;
    }
    return count > 0 ? sum / count : null;
}

export function smoothSeries(values: number[], windowSize: number): number[] {
    if (windowSize <= 1 || values.length <= 1) {
        return values;
    }

    const window = Math.max(1, Math.floor(windowSize));
    return values.map((_, index) => {
        const start = Math.max(0, index - window + 1);
        const slice = values.slice(start, index + 1);
        const sum = slice.reduce((acc, val) => acc + val, 0);
        return slice.length ? sum / slice.length : 0;
    });
}

export function buildStatusAges(
    incidents: Array<{ status: string; createdAt: Date; updatedAt?: Date | null; resolvedAt?: Date | null }>,
    now: Date,
    statusOrder: string[]
): StatusAgeEntry[] {
    const statusAgeMap = new Map<string, { totalMs: number; count: number }>();
    for (const incident of incidents) {
        const resolvedAt = incident.resolvedAt || incident.updatedAt;
        const durationMs = incident.status === 'RESOLVED' && resolvedAt
            ? resolvedAt.getTime() - incident.createdAt.getTime()
            : now.getTime() - incident.createdAt.getTime();
        const current = statusAgeMap.get(incident.status) || { totalMs: 0, count: 0 };
        current.totalMs += durationMs;
        current.count += 1;
        statusAgeMap.set(incident.status, current);
    }

    return statusOrder.map(status => {
        const data = statusAgeMap.get(status);
        const avgMs = data && data.count ? data.totalMs / data.count : null;
        return { status, avgMs };
    });
}

export function buildOnCallLoad(
    shifts: OnCallShift[],
    incidents: Array<{ createdAt: Date }>,
    windowStart: Date,
    windowEnd: Date,
    userNameMap: Map<string, string>,
    limit: number = 6
): OnCallLoadEntry[] {
    const onCallLoadMap = new Map<string, { hoursMs: number; incidentCount: number }>();

    for (const shift of shifts) {
        const shiftStart = shift.start < windowStart ? windowStart : shift.start;
        const shiftEnd = shift.end > windowEnd ? windowEnd : shift.end;
        if (shiftEnd <= shiftStart) {
            continue;
        }
        const entry = onCallLoadMap.get(shift.userId) || { hoursMs: 0, incidentCount: 0 };
        entry.hoursMs += shiftEnd.getTime() - shiftStart.getTime();
        onCallLoadMap.set(shift.userId, entry);
    }

    for (const incident of incidents) {
        for (const shift of shifts) {
            if (incident.createdAt >= shift.start && incident.createdAt <= shift.end) {
                const entry = onCallLoadMap.get(shift.userId) || { hoursMs: 0, incidentCount: 0 };
                entry.incidentCount += 1;
                onCallLoadMap.set(shift.userId, entry);
            }
        }
    }

    return Array.from(onCallLoadMap.entries())
        .map(([userId, stats]) => ({
            id: userId,
            name: userNameMap.get(userId) || 'Unknown user',
            hoursMs: stats.hoursMs,
            incidentCount: stats.incidentCount
        }))
        .sort((a, b) => b.incidentCount - a.incidentCount)
        .slice(0, limit);
}

export function buildServiceSlaTable(
    incidents: Array<{
        id: string;
        createdAt: Date;
        status: string;
        resolvedAt: Date | null;
        updatedAt: Date | null;
        serviceId: string;
    }>,
    ackMap: Map<string, Date>,
    serviceTargets: Map<string, { ackMinutes: number; resolveMinutes: number }>,
    serviceNameMap: Map<string, string>,
    defaultAckMinutes: number = 15,
    defaultResolveMinutes: number = 120,
    limit: number = 8
): ServiceSlaEntry[] {
    const serviceSlaStats = new Map<string, { ackMet: number; ackTotal: number; resolveMet: number; resolveTotal: number }>();

    for (const incident of incidents) {
        const targets = serviceTargets.get(incident.serviceId);
        const ackTargetMinutes = targets?.ackMinutes ?? defaultAckMinutes;
        const resolveTargetMinutes = targets?.resolveMinutes ?? defaultResolveMinutes;
        const current = serviceSlaStats.get(incident.serviceId) || { ackMet: 0, ackTotal: 0, resolveMet: 0, resolveTotal: 0 };

        const ackedAt = ackMap.get(incident.id);
        if (ackedAt) {
            current.ackTotal += 1;
            const diffMinutes = (ackedAt.getTime() - incident.createdAt.getTime()) / 60000;
            if (diffMinutes <= ackTargetMinutes) {
                current.ackMet += 1;
            }
        }

        if (incident.status === 'RESOLVED') {
            const resolvedAt = incident.resolvedAt || incident.updatedAt;
            if (resolvedAt) {
                current.resolveTotal += 1;
                const diffMinutes = (resolvedAt.getTime() - incident.createdAt.getTime()) / 60000;
                if (diffMinutes <= resolveTargetMinutes) {
                    current.resolveMet += 1;
                }
            }
        }

        serviceSlaStats.set(incident.serviceId, current);
    }

    return Array.from(serviceSlaStats.entries())
        .map(([serviceId, stats]) => ({
            id: serviceId,
            name: serviceNameMap.get(serviceId) || 'Deleted service',
            ackRate: stats.ackTotal ? (stats.ackMet / stats.ackTotal) * 100 : 0,
            resolveRate: stats.resolveTotal ? (stats.resolveMet / stats.resolveTotal) * 100 : 0,
            total: Math.max(stats.ackTotal, stats.resolveTotal)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
}
