import { formatTimeMinutes, formatTimeMinutesMs } from './time-format';

/**
 * Client-safe SLA utilities (pure functions, no database access)
 * For server-only functions that use Prisma, see ./sla-server.ts
 */

export type SLAMetrics = {
    mttr: number | null; // Mean Time To Resolve (minutes)
    mttd: number | null; // Mean Time To Detect (minutes)
    mtti: number | null; // Mean Time To Investigate (minutes) - time from creation to first note/event
    mttk: number | null; // Mean Time To Know (minutes) - similar to MTTD
    ackCompliance: number; // Percentage of incidents acknowledged within SLA
    resolveCompliance: number; // Percentage of incidents resolved within SLA
    totalIncidents: number;
    ackBreaches: number;
    resolveBreaches: number;
};

/**
 * Format time in minutes to human-readable string
 */
// Re-export for backward compatibility
export { formatTimeMinutes, formatTimeMinutesMs } from './time-format';

/**
 * Calculate Mean Time To Acknowledge (MTTA) for a single incident
 * Returns time in milliseconds
 */
export function calculateMTTA(incident: { acknowledgedAt: Date | null; createdAt: Date }): number | null {
    if (incident.acknowledgedAt && incident.createdAt) {
        return incident.acknowledgedAt.getTime() - incident.createdAt.getTime();
    }
    return null;
}

/**
 * Calculate Mean Time To Resolve (MTTR) for a single incident
 * Returns time in milliseconds
 */
export function calculateMTTR(incident: { resolvedAt: Date | null; createdAt: Date }): number | null {
    if (incident.resolvedAt && incident.createdAt) {
        return incident.resolvedAt.getTime() - incident.createdAt.getTime();
    }
    return null;
}

/**
 * Check if an incident met the acknowledgement SLA
 */
export function checkAckSLA(incident: { acknowledgedAt: Date | null; createdAt: Date }, service: { targetAckMinutes?: number | null }): boolean {
    if (!incident.acknowledgedAt || !incident.createdAt) return false;
    const ackTimeMinutes = (incident.acknowledgedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
    const target = service.targetAckMinutes ?? 15; // Default to 15 minutes
    return ackTimeMinutes <= target;
}

/**
 * Check if an incident met the resolution SLA
 */
export function checkResolveSLA(incident: { resolvedAt: Date | null; createdAt: Date }, service: { targetResolveMinutes?: number | null }): boolean {
    if (!incident.resolvedAt || !incident.createdAt) return false;
    const resolveTimeMinutes = (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
    const target = service.targetResolveMinutes ?? 120; // Default to 120 minutes
    return resolveTimeMinutes <= target;
}

