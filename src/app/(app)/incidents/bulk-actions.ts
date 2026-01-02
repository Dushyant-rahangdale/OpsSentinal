'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { assertResponderOrAbove, getCurrentUser } from '@/lib/rbac';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import { logger } from '@/lib/logger';

export async function bulkAcknowledge(incidentIds: string[]) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        // Update all selected incidents to ACKNOWLEDGED
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds },
                status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] } // Only update non-resolved incidents
            },
            data: {
                status: 'ACKNOWLEDGED',
                acknowledgedAt: new Date()
            }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk acknowledged${user ? ` by ${user.name}` : ''}`
                }
            });

            // Send notifications
            try {
                const { sendIncidentNotifications } = await import('@/lib/user-notifications');
                await sendIncidentNotifications(incidentId, 'acknowledged');

                const { notifyStatusPageSubscribers } = await import('@/lib/status-page-notifications');
                await notifyStatusPageSubscribers(incidentId, 'acknowledged');

                // Webhooks for ack? Usually incident.acknowledged
                // Not strictly required by user request but good for consistency
                const { triggerWebhooksForService } = await import('@/lib/status-page-webhooks');
                const incident = await prisma.incident.findUnique({
                    where: { id: incidentId },
                    include: {
                        service: { select: { id: true, name: true } },
                        assignee: { select: { id: true, name: true, email: true } },
                    }
                });

                if (incident) {
                    await triggerWebhooksForService(
                        incident.serviceId,
                        'incident.acknowledged',
                        {
                            id: incident.id,
                            title: incident.title,
                            description: incident.description,
                            status: incident.status,
                            urgency: incident.urgency,
                            priority: incident.priority,
                            service: incident.service,
                            assignee: incident.assignee,
                            createdAt: incident.createdAt.toISOString(),
                            acknowledgedAt: incident.acknowledgedAt?.toISOString() || new Date().toISOString()
                        }
                    );
                }

            } catch (e) {
                logger.error('Failed to send notifications for incident', { component: 'bulk-actions', action: 'acknowledge', error: e, incidentId });
            }
        }

        revalidatePath('/incidents');
        revalidatePath('/');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk acknowledge failed', { component: 'bulk-actions', error, incidentIds });
        return { success: false, error: 'Failed to acknowledge incidents' };
    }
}

export async function bulkResolve(incidentIds: string[]) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        // Update all selected incidents to RESOLVED
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds }
            },
            data: {
                status: 'RESOLVED',
                escalationStatus: 'COMPLETED',
                nextEscalationAt: null,
                resolvedAt: new Date()
            }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk resolved${user ? ` by ${user.name}` : ''}`
                }
            });

            // Send notifications
            try {
                const { sendIncidentNotifications } = await import('@/lib/user-notifications');
                await sendIncidentNotifications(incidentId, 'resolved');

                const { notifyStatusPageSubscribers } = await import('@/lib/status-page-notifications');
                await notifyStatusPageSubscribers(incidentId, 'resolved');

                const { triggerWebhooksForService } = await import('@/lib/status-page-webhooks');
                // Fetch incident details for webhook
                const incident = await prisma.incident.findUnique({
                    where: { id: incidentId },
                    include: {
                        service: { select: { id: true, name: true } },
                        assignee: { select: { id: true, name: true, email: true } },
                    }
                });

                if (incident) {
                    await triggerWebhooksForService(
                        incident.serviceId,
                        'incident.resolved',
                        {
                            id: incident.id,
                            title: incident.title,
                            description: incident.description,
                            status: incident.status,
                            urgency: incident.urgency,
                            priority: incident.priority,
                            service: incident.service,
                            assignee: incident.assignee,
                            createdAt: incident.createdAt.toISOString(),
                            resolvedAt: incident.resolvedAt?.toISOString() || new Date().toISOString()
                        }
                    );
                }
            } catch (e) {
                logger.error('Failed to send notifications for incident', { component: 'bulk-actions', action: 'resolve', error: e, incidentId });
            }
        }

        revalidatePath('/incidents');
        revalidatePath('/');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk resolve failed', { component: 'bulk-actions', error, incidentIds });
        return { success: false, error: 'Failed to resolve incidents' };
    }
}

export async function bulkReassign(incidentIds: string[], assigneeId: string) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    if (!assigneeId) {
        return { success: false, error: 'Assignee is required' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
        if (!assignee) {
            return { success: false, error: 'Assignee not found' };
        }

        // Update all selected incidents
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds }
            },
            data: { assigneeId }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk reassigned to ${assignee.name}${user ? ` by ${user.name}` : ''}`
                }
            });

            // Send notifications
            try {
                const { sendIncidentNotifications } = await import('@/lib/user-notifications');
                await sendIncidentNotifications(incidentId, 'updated');

                // Webhook for assignment change (incident.updated or incident.assigned if supported)
                const { triggerWebhooksForService } = await import('@/lib/status-page-webhooks');
                const incident = await prisma.incident.findUnique({
                    where: { id: incidentId },
                    include: {
                        service: { select: { id: true, name: true } },
                        assignee: { select: { id: true, name: true, email: true } },
                    }
                });

                if (incident) {
                    await triggerWebhooksForService(
                        incident.serviceId,
                        'incident.updated',
                        {
                            id: incident.id,
                            title: incident.title,
                            description: incident.description,
                            status: incident.status,
                            urgency: incident.urgency,
                            priority: incident.priority,
                            service: incident.service,
                            assignee: incident.assignee,
                            createdAt: incident.createdAt.toISOString()
                        }
                    );
                }
            } catch (e) {
                logger.error('Failed to send notifications for incident', { component: 'bulk-actions', action: 'reassign', error: e, incidentId });
            }
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk reassign failed', { component: 'bulk-actions', error, incidentIds, assigneeId });
        return { success: false, error: 'Failed to reassign incidents' };
    }
}

export async function bulkUpdatePriority(incidentIds: string[], priority: string) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        // Update all selected incidents
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds }
            },
            data: { priority: priority || null }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk priority updated to ${priority || 'Auto'}${user ? ` by ${user.name}` : ''}`
                }
            });
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk priority update failed', { component: 'bulk-actions', error, incidentIds, priority });
        return { success: false, error: 'Failed to update priority' };
    }
}

export async function bulkSnooze(incidentIds: string[], durationMinutes: number, reason: string | null) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        const snoozedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

        // Update all selected incidents
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds },
                status: { notIn: ['RESOLVED'] } // Don't snooze resolved incidents
            },
            data: {
                status: 'SNOOZED',
                snoozedUntil,
                snoozeReason: reason,
                escalationStatus: 'PAUSED',
                nextEscalationAt: null
            }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        const userTimeZone = getUserTimeZone(user ?? undefined);
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk snoozed until ${formatDateTime(snoozedUntil, userTimeZone, { format: 'datetime' })}${reason ? `: ${reason}` : ''}${user ? ` by ${user.name}` : ''}`
                }
            }).catch(() => { }); // Ignore errors if incident was already resolved
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk snooze failed', { component: 'bulk-actions', error, incidentIds, durationMinutes });
        return { success: false, error: 'Failed to snooze incidents' };
    }
}

export async function bulkUnsnooze(incidentIds: string[]) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        // Update all selected incidents
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds },
                status: 'SNOOZED'
            },
            data: {
                status: 'OPEN',
                snoozedUntil: null,
                snoozeReason: null,
                escalationStatus: 'ESCALATING',
                nextEscalationAt: new Date()
            }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk unsnoozed${user ? ` by ${user.name}` : ''}`
                }
            }).catch(() => { }); // Ignore errors if incident wasn't snoozed
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk unsnooze failed', { component: 'bulk-actions', error, incidentIds });
        return { success: false, error: 'Failed to unsnooze incidents' };
    }
}

export async function bulkSuppress(incidentIds: string[]) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        // Update all selected incidents
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds },
                status: { notIn: ['RESOLVED'] } // Don't suppress resolved incidents
            },
            data: {
                status: 'SUPPRESSED',
                escalationStatus: 'PAUSED',
                nextEscalationAt: null
            }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk suppressed${user ? ` by ${user.name}` : ''}`
                }
            }).catch(() => { }); // Ignore errors if incident was already resolved
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk suppress failed', { component: 'bulk-actions', error, incidentIds });
        return { success: false, error: 'Failed to suppress incidents' };
    }
}

export async function bulkUnsuppress(incidentIds: string[]) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        // Update all selected incidents
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds },
                status: 'SUPPRESSED'
            },
            data: {
                status: 'OPEN',
                escalationStatus: 'ESCALATING',
                nextEscalationAt: new Date()
            }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk unsuppressed${user ? ` by ${user.name}` : ''}`
                }
            }).catch(() => { }); // Ignore errors if incident wasn't suppressed
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk unsuppress failed', { component: 'bulk-actions', error, incidentIds });
        return { success: false, error: 'Failed to unsuppress incidents' };
    }
}

export async function bulkUpdateUrgency(incidentIds: string[], urgency: 'HIGH' | 'LOW') {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        // Update all selected incidents
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds }
            },
            data: { urgency }
        });

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk urgency updated to ${urgency}${user ? ` by ${user.name}` : ''}`
                }
            });
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk urgency update failed', { component: 'bulk-actions', error, incidentIds, urgency });
        return { success: false, error: 'Failed to update urgency' };
    }
}

export async function bulkUpdateStatus(incidentIds: string[], status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'SUPPRESSED') {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        await assertResponderOrAbove();
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unauthorized' };
    }

    try {
        if (status === 'OPEN') {
            const incidents = await prisma.incident.findMany({
                where: { id: { in: incidentIds } },
                select: {
                    id: true,
                    status: true,
                    currentEscalationStep: true,
                    service: {
                        select: {
                            policy: {
                                select: {
                                    steps: {
                                        orderBy: { stepOrder: 'asc' },
                                        select: { delayMinutes: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

                for (const incident of incidents) {
                    let nextEscalationAt: Date | null = new Date();
                    if (incident.status === 'ACKNOWLEDGED') {
                        const stepIndex = incident.currentEscalationStep ?? 0;
                        const steps = incident.service?.policy?.steps ?? [];
                        const step = steps.find((_, index) => index === stepIndex);
                        const delayMinutes = step?.delayMinutes ?? 0;
                        nextEscalationAt = new Date(Date.now() + delayMinutes * 60 * 1000);
                    }

                await prisma.incident.update({
                    where: { id: incident.id },
                    data: {
                        status,
                        escalationStatus: 'ESCALATING',
                        nextEscalationAt
                    }
                });
            }
        } else {
            const updateData: any = { status }; // eslint-disable-line @typescript-eslint/no-explicit-any

            if (status === 'ACKNOWLEDGED') {
                updateData.acknowledgedAt = new Date();
            } else if (status === 'RESOLVED') {
                updateData.resolvedAt = new Date();
                updateData.escalationStatus = 'COMPLETED';
                updateData.nextEscalationAt = null;
            } else if (status === 'SNOOZED' || status === 'SUPPRESSED') {
                updateData.escalationStatus = 'PAUSED';
                updateData.nextEscalationAt = null;
            }

            await prisma.incident.updateMany({
                where: {
                    id: { in: incidentIds }
                },
                data: updateData
            });
        }

        // Log events for each incident
        const user = await getCurrentUser();
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Bulk status updated to ${status}${user ? ` by ${user.name}` : ''}`
                }
            });

            // Send notifications based on status
            try {
                const { sendIncidentNotifications } = await import('@/lib/user-notifications');
                const { notifyStatusPageSubscribers } = await import('@/lib/status-page-notifications');
                const { triggerWebhooksForService } = await import('@/lib/status-page-webhooks');

                if (status === 'ACKNOWLEDGED') {
                    await sendIncidentNotifications(incidentId, 'acknowledged');
                    await notifyStatusPageSubscribers(incidentId, 'acknowledged');
                } else if (status === 'RESOLVED') {
                    await sendIncidentNotifications(incidentId, 'resolved');
                    await notifyStatusPageSubscribers(incidentId, 'resolved');
                } else if (status === 'OPEN') {
                    await sendIncidentNotifications(incidentId, 'updated');
                    // Note: subscribers don't usually get "re-opened" emails unless we specifically want to
                    // But webhooks might care.
                }

                // Webhooks
                const incident = await prisma.incident.findUnique({
                    where: { id: incidentId },
                    include: {
                        service: { select: { id: true, name: true } },
                        assignee: { select: { id: true, name: true, email: true } },
                    }
                });

                if (incident) {
                    let eventType = 'incident.updated';
                    if (status === 'RESOLVED') eventType = 'incident.resolved';
                    else if (status === 'ACKNOWLEDGED') eventType = 'incident.acknowledged';
                    else if (status === 'SNOOZED') eventType = 'incident.snoozed';
                    else if (status === 'SUPPRESSED') eventType = 'incident.suppressed';

                    await triggerWebhooksForService(
                        incident.serviceId,
                        eventType,
                        {
                            id: incident.id,
                            title: incident.title,
                            description: incident.description,
                            status: incident.status,
                            urgency: incident.urgency,
                            priority: incident.priority,
                            service: incident.service,
                            assignee: incident.assignee,
                            createdAt: incident.createdAt.toISOString(),
                            acknowledgedAt: incident.acknowledgedAt?.toISOString() || null,
                            resolvedAt: incident.resolvedAt?.toISOString() || null
                        }
                    );
                }

            } catch (e) {
                logger.error('Failed to send notifications for incident', { component: 'bulk-actions', action: 'status-update', error: e, incidentId, status });
            }
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        logger.error('Bulk status update failed', { component: 'bulk-actions', error, incidentIds, status });
        return { success: false, error: 'Failed to update status' };
    }
}
