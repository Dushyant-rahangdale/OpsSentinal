import prisma from './prisma';
import { executeEscalation } from './notifications';
import { notifySlackForIncident } from './slack';

export type EventPayload = {
    event_action: 'trigger' | 'resolve' | 'acknowledge';
    dedup_key: string;
    payload: {
        summary: string;
        source: string;
        severity: 'critical' | 'error' | 'warning' | 'info';
        custom_details?: any;
    };
};

export async function processEvent(payload: EventPayload, serviceId: string, integrationId: string) {
    const { event_action, dedup_key, payload: eventData } = payload;

    // 1. Log the raw alert
    const alert = await prisma.alert.create({
        data: {
            dedupKey: dedup_key,
            status: event_action === 'resolve' ? 'RESOLVED' : 'TRIGGERED',
            payload: eventData as object,
            serviceId,
        }
    });

    // 2. Find existing open incident with this dedup_key
    const existingIncident = await prisma.incident.findFirst({
        where: {
            dedupKey: dedup_key,
            status: { not: 'RESOLVED' }
        }
    });

    if (event_action === 'trigger') {
        if (existingIncident) {
            // Deduplication: Just append the alert to the incident
            await prisma.alert.update({
                where: { id: alert.id },
                data: { incidentId: existingIncident.id }
            });

            // Log an event instead of note (no userId needed)
            await prisma.incidentEvent.create({
                data: {
                    incidentId: existingIncident.id,
                    message: `Re-triggered by event from ${eventData.source}. Summary: ${eventData.summary}`
                }
            });

            return { action: 'deduplicated', incident: existingIncident };
        } else {
            // Create New Incident
            const newIncident = await prisma.incident.create({
                data: {
                    title: eventData.summary,
                    description: eventData.custom_details ? JSON.stringify(eventData.custom_details, null, 2) : null,
                    status: 'OPEN',
                    urgency: eventData.severity === 'critical' ? 'HIGH' : 'LOW',
                    dedupKey: dedup_key,
                    serviceId,
                }
            });

            // Connect alert to incident
            await prisma.alert.update({
                where: { id: alert.id },
                data: { incidentId: newIncident.id }
            });

            // Log timeline event
            await prisma.incidentEvent.create({
                data: {
                    incidentId: newIncident.id,
                    message: `Incident triggered via API from ${eventData.source}`
                }
            });

            // Execute escalation policy - send notifications
            try {
                await executeEscalation(newIncident.id);
            } catch (e) {
                console.error('Escalation failed:', e);
            }

            // Send Slack notification
            notifySlackForIncident(newIncident.id, 'triggered').catch(console.error);

            return { action: 'triggered', incident: newIncident };
        }
    }

    if (event_action === 'resolve' && existingIncident) {
        await prisma.alert.update({
            where: { id: alert.id },
            data: { incidentId: existingIncident.id }
        });

        const resolvedIncident = await prisma.incident.update({
            where: { id: existingIncident.id },
            data: { status: 'RESOLVED' }
        });

        await prisma.incidentEvent.create({
            data: {
                incidentId: existingIncident.id,
                message: `Auto-resolved by event from ${eventData.source}.`
            }
        });

        // Send Slack notification for resolve
        notifySlackForIncident(existingIncident.id, 'resolved').catch(console.error);

        return { action: 'resolved', incident: resolvedIncident };
    }

    if (event_action === 'acknowledge' && existingIncident) {
        await prisma.alert.update({
            where: { id: alert.id },
            data: { incidentId: existingIncident.id }
        });

        const ackIncident = await prisma.incident.update({
            where: { id: existingIncident.id },
            data: { status: 'ACKNOWLEDGED' }
        });

        await prisma.incidentEvent.create({
            data: {
                incidentId: existingIncident.id,
                message: `Acknowledged via API event.`
            }
        });

        // Send Slack notification for acknowledge
        notifySlackForIncident(existingIncident.id, 'acknowledged').catch(console.error);

        return { action: 'acknowledged', incident: ackIncident };
    }

    return { action: 'ignored', reason: 'No matching incident to resolve/ack' };
}
