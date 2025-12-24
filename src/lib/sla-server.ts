import 'server-only';

import type { SLAMetrics } from './sla';

/**
 * Calculate SLA metrics for a service or all services
 * SERVER-ONLY: Uses Prisma client
 */
export async function calculateSLAMetrics(serviceId?: string, startDate?: Date, endDate?: Date): Promise<SLAMetrics> {
    const { default: prisma } = await import('./prisma');
    
    const where: any = {
        status: 'RESOLVED'
    };

    if (serviceId) {
        where.serviceId = serviceId;
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const resolvedIncidents = await prisma.incident.findMany({
        where,
        include: {
            service: true,
            events: {
                orderBy: { createdAt: 'asc' },
                take: 1
            },
            notes: {
                orderBy: { createdAt: 'asc' },
                take: 1
            },
            alerts: {
                orderBy: { createdAt: 'asc' },
                take: 1
            }
        }
    });

    if (resolvedIncidents.length === 0) {
        return {
            mttr: null,
            mttd: null,
            mtti: null,
            mttk: null,
            ackCompliance: 0,
            resolveCompliance: 0,
            totalIncidents: 0,
            ackBreaches: 0,
            resolveBreaches: 0
        };
    }

    // Calculate MTTR (Mean Time To Resolve)
    const resolveTimes = resolvedIncidents
        .filter(i => i.resolvedAt && i.createdAt)
        .map(i => {
            const created = i.createdAt.getTime();
            const resolved = i.resolvedAt!.getTime();
            return (resolved - created) / (1000 * 60); // Convert to minutes
        });

    const mttr = resolveTimes.length > 0
        ? resolveTimes.reduce((sum, time) => sum + time, 0) / resolveTimes.length
        : null;

    // Calculate MTTD (Mean Time To Detect) - time from first alert to incident creation
    // Use the first alert timestamp if available, otherwise use incident creation time
    const detectionTimes = resolvedIncidents
        .filter(incident => {
            // Only calculate if we have alerts or can use incident creation time
            return incident.alerts.length > 0 || incident.createdAt;
        })
        .map(incident => {
            if (incident.alerts.length > 0) {
                // Use first alert timestamp as detection time
                const alertTime = incident.alerts[0].createdAt.getTime();
                const incidentTime = incident.createdAt.getTime();
                // MTTD = time from alert to incident creation (detection time)
                return (incidentTime - alertTime) / (1000 * 60); // Convert to minutes
            } else {
                // For manually created incidents without alerts, detection time is 0
                return 0;
            }
        });

    const mttd = detectionTimes.length > 0
        ? detectionTimes.reduce((sum, time) => sum + time, 0) / detectionTimes.length
        : null;

    // Calculate MTTI (Mean Time To Investigate) - time from creation to first note
    const investigateTimes = resolvedIncidents
        .filter(i => i.notes.length > 0)
        .map(i => {
            const created = i.createdAt.getTime();
            const firstNote = i.notes[0].createdAt.getTime();
            return (firstNote - created) / (1000 * 60); // Convert to minutes
        });

    const mtti = investigateTimes.length > 0
        ? investigateTimes.reduce((sum, time) => sum + time, 0) / investigateTimes.length
        : null;

    // Calculate MTTK (Mean Time To Know) - similar to MTTD
    const mttk = mttd;

    // Calculate SLA compliance
    let ackCompliant = 0;
    let ackBreaches = 0;
    let resolveCompliant = 0;
    let resolveBreaches = 0;

    for (const incident of resolvedIncidents) {
        const targetAckMinutes = incident.service.targetAckMinutes || 15;
        const targetResolveMinutes = incident.service.targetResolveMinutes || 120;

        // Check acknowledgment SLA
        if (incident.acknowledgedAt) {
            const ackTime = (incident.acknowledgedAt.getTime() - incident.createdAt.getTime()) / (1000 * 60);
            if (ackTime <= targetAckMinutes) {
                ackCompliant++;
            } else {
                ackBreaches++;
            }
        } else {
            // If never acknowledged, check if it should have been
            const timeToResolve = incident.resolvedAt
                ? (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / (1000 * 60)
                : null;
            if (timeToResolve && timeToResolve > targetAckMinutes) {
                ackBreaches++;
            }
        }

        // Check resolution SLA
        if (incident.resolvedAt) {
            const resolveTime = (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / (1000 * 60);
            if (resolveTime <= targetResolveMinutes) {
                resolveCompliant++;
            } else {
                resolveBreaches++;
            }
        }
    }

    const totalIncidents = resolvedIncidents.length;
    const ackCompliance = totalIncidents > 0 ? (ackCompliant / totalIncidents) * 100 : 0;
    const resolveCompliance = totalIncidents > 0 ? (resolveCompliant / totalIncidents) * 100 : 0;

    return {
        mttr,
        mttd,
        mtti,
        mttk,
        ackCompliance: Math.round(ackCompliance * 100) / 100, // Round to 2 decimal places
        resolveCompliance: Math.round(resolveCompliance * 100) / 100,
        totalIncidents,
        ackBreaches,
        resolveBreaches
    };
}

/**
 * Check if an incident is breaching SLA
 * SERVER-ONLY: Uses Prisma client
 */
export async function checkIncidentSLA(incidentId: string): Promise<{
    ackSLA: { breached: boolean; timeRemaining: number | null; targetMinutes: number };
    resolveSLA: { breached: boolean; timeRemaining: number | null; targetMinutes: number };
}> {
    const { default: prisma } = await import('./prisma');
    const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { service: true }
    });

    if (!incident) {
        throw new Error('Incident not found');
    }

    const now = new Date();
    const createdAt = incident.createdAt.getTime();
    const nowTime = now.getTime();
    const elapsedMinutes = (nowTime - createdAt) / (1000 * 60);

    const targetAckMinutes = incident.service.targetAckMinutes || 15;
    const targetResolveMinutes = incident.service.targetResolveMinutes || 120;

    // Check acknowledgment SLA
    let ackBreached = false;
    let ackTimeRemaining: number | null = null;

    if (incident.acknowledgedAt) {
        const ackTime = (incident.acknowledgedAt.getTime() - createdAt) / (1000 * 60);
        ackBreached = ackTime > targetAckMinutes;
    } else if (incident.status !== 'RESOLVED') {
        ackBreached = elapsedMinutes > targetAckMinutes;
        ackTimeRemaining = Math.max(0, targetAckMinutes - elapsedMinutes);
    }

    // Check resolution SLA
    let resolveBreached = false;
    let resolveTimeRemaining: number | null = null;

    if (incident.resolvedAt) {
        const resolveTime = (incident.resolvedAt.getTime() - createdAt) / (1000 * 60);
        resolveBreached = resolveTime > targetResolveMinutes;
    } else if (incident.status !== 'RESOLVED') {
        resolveBreached = elapsedMinutes > targetResolveMinutes;
        resolveTimeRemaining = Math.max(0, targetResolveMinutes - elapsedMinutes);
    }

    return {
        ackSLA: {
            breached: ackBreached,
            timeRemaining: ackTimeRemaining,
            targetMinutes: targetAckMinutes
        },
        resolveSLA: {
            breached: resolveBreached,
            timeRemaining: resolveTimeRemaining,
            targetMinutes: targetResolveMinutes
        }
    };
}

