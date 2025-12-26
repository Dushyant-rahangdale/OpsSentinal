'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { assertResponderOrAbove, getCurrentUser } from '@/lib/rbac';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

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
                status: { not: 'RESOLVED' } // Only update non-resolved incidents
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
                const { sendServiceNotifications } = await import('@/lib/user-notifications');
                await sendServiceNotifications(incidentId, 'acknowledged');

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
                console.error(`Failed to send notifications for incident ${incidentId}:`, e);
            }
        }

        revalidatePath('/incidents');
        revalidatePath('/');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        console.error('Bulk acknowledge failed:', error);
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
                const { sendServiceNotifications } = await import('@/lib/user-notifications');
                await sendServiceNotifications(incidentId, 'resolved');

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
                console.error(`Failed to send notifications for incident ${incidentId}:`, e);
            }
        }

        revalidatePath('/incidents');
        revalidatePath('/');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        console.error('Bulk resolve failed:', error);
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
                const { sendServiceNotifications } = await import('@/lib/user-notifications');
                await sendServiceNotifications(incidentId, 'updated');

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
                console.error(`Failed to send notifications for incident ${incidentId}:`, e);
            }
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        console.error('Bulk reassign failed:', error);
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
        console.error('Bulk priority update failed:', error);
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
        console.error('Bulk snooze failed:', error);
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
        console.error('Bulk unsnooze failed:', error);
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
        console.error('Bulk suppress failed:', error);
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
        console.error('Bulk unsuppress failed:', error);
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
        console.error('Bulk urgency update failed:', error);
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
        const updateData: any = { status };

        // Set appropriate timestamps
        if (status === 'ACKNOWLEDGED') {
            updateData.acknowledgedAt = new Date();
        } else if (status === 'RESOLVED') {
            updateData.resolvedAt = new Date();
            updateData.escalationStatus = 'COMPLETED';
            updateData.nextEscalationAt = null;
        } else if (status === 'SNOOZED' || status === 'SUPPRESSED') {
            updateData.escalationStatus = 'PAUSED';
            updateData.nextEscalationAt = null;
        } else if (status === 'OPEN') {
            updateData.escalationStatus = 'ESCALATING';
            updateData.nextEscalationAt = new Date();
        }

        // Update all selected incidents
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds }
            },
            data: updateData
        });

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
                const { sendServiceNotifications } = await import('@/lib/user-notifications');
                const { notifyStatusPageSubscribers } = await import('@/lib/status-page-notifications');
                const { triggerWebhooksForService } = await import('@/lib/status-page-webhooks');

                if (status === 'ACKNOWLEDGED') {
                    await sendServiceNotifications(incidentId, 'acknowledged');
                    await notifyStatusPageSubscribers(incidentId, 'acknowledged');
                } else if (status === 'RESOLVED') {
                    await sendServiceNotifications(incidentId, 'resolved');
                    await notifyStatusPageSubscribers(incidentId, 'resolved');
                } else if (status === 'OPEN') {
                    await sendServiceNotifications(incidentId, 'updated');
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
                console.error(`Failed to send notifications for incident ${incidentId}:`, e);
            }
        }

        revalidatePath('/incidents');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        console.error('Bulk status update failed:', error);
        return { success: false, error: 'Failed to update status' };
    }
}