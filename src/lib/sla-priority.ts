import { Incident, Service } from '@prisma/client';

// Priority-based SLA targets (in minutes)
const PRIORITY_SLA_TARGETS: Record<string, { ack: number; resolve: number }> = {
    'P1': { ack: 5, resolve: 60 },    // Critical - 5 min ack, 1 hour resolve
    'P2': { ack: 15, resolve: 240 },  // High - 15 min ack, 4 hours resolve
    'P3': { ack: 30, resolve: 480 },  // Medium - 30 min ack, 8 hours resolve
    'P4': { ack: 60, resolve: 1440 }, // Low - 1 hour ack, 24 hours resolve
    'P5': { ack: 120, resolve: 2880 } // Info - 2 hours ack, 48 hours resolve
};

export function getPrioritySLATarget(priority: string | null | undefined, service: Service): { ack: number; resolve: number } {
    if (priority && PRIORITY_SLA_TARGETS[priority]) {
        return PRIORITY_SLA_TARGETS[priority];
    }
    // Default to service targets if no priority or priority not found
    return {
        ack: service.targetAckMinutes ?? 15,
        resolve: service.targetResolveMinutes ?? 120
    };
}

export function checkPriorityAckSLA(incident: Incident, service: Service): boolean {
    if (!incident.acknowledgedAt || !incident.createdAt || !incident.priority) return false;
    const ackTimeMinutes = (incident.acknowledgedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
    const target = getPrioritySLATarget(incident.priority, service);
    return ackTimeMinutes <= target.ack;
}

export function checkPriorityResolveSLA(incident: Incident, service: Service): boolean {
    if (!incident.resolvedAt || !incident.createdAt || !incident.priority) return false;
    const resolveTimeMinutes = (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
    const target = getPrioritySLATarget(incident.priority, service);
    return resolveTimeMinutes <= target.resolve;
}









