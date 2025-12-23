'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { IncidentStatus, IncidentUrgency } from '@prisma/client';
import { notifySlackForIncident } from '@/lib/slack';
import { getCurrentUser, assertResponderOrAbove, assertCanModifyIncident } from '@/lib/rbac';

export async function updateIncidentStatus(id: string, status: IncidentStatus) {
    try {
        // Check resource-level authorization
        await assertCanModifyIncident(id);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    const currentIncident = await prisma.$transaction(async (tx) => {
        // Get current incident to check if we're setting acknowledgedAt for the first time
        const incident = await tx.incident.findUnique({
            where: { id },
            select: { status: true, acknowledgedAt: true, resolvedAt: true }
        });

        if (!incident) {
            throw new Error('Incident not found.');
        }

        // Build update data
        const updateData: any = {
            status,
            // Track SLA timestamps
            ...(status === 'ACKNOWLEDGED' && !incident.acknowledgedAt ? {
                acknowledgedAt: new Date()
            } : {}),
            ...(status === 'RESOLVED' && !incident.resolvedAt ? {
                resolvedAt: new Date()
            } : {}),
            events: {
                create: {
                    message: status === 'SNOOZED' 
                        ? 'Incident snoozed (escalation paused)'
                        : status === 'SUPPRESSED'
                        ? 'Incident suppressed (escalation paused)'
                        : status === 'OPEN' && incident.status === 'ACKNOWLEDGED'
                        ? 'Incident unacknowledged (escalation resumed)'
                        : status === 'OPEN' && (incident.status === 'SNOOZED' || incident.status === 'SUPPRESSED')
                        ? 'Incident unsnoozed/unsuppressed (escalation resumed)'
                        : `Status updated to ${status}${status === 'ACKNOWLEDGED' || status === 'RESOLVED' ? ' (escalation stopped)' : ''}`
                }
            }
        };

        // Handle escalation status based on new status
        if (status === 'ACKNOWLEDGED' || status === 'RESOLVED') {
            // Completed - stop escalation permanently
            updateData.escalationStatus = 'COMPLETED';
            updateData.nextEscalationAt = null;
        } else if (status === 'SNOOZED' || status === 'SUPPRESSED') {
            // Paused - stop escalation temporarily
            updateData.escalationStatus = 'PAUSED';
            updateData.nextEscalationAt = null;
        } else if (status === 'OPEN') {
            // Resuming from any paused state - resume escalation
            if (incident.status === 'SNOOZED' || incident.status === 'SUPPRESSED' || incident.status === 'ACKNOWLEDGED') {
                updateData.escalationStatus = 'ESCALATING';
                updateData.nextEscalationAt = new Date(); // Resume immediately
            }
        }
        
        await tx.incident.update({
            where: { id },
            data: updateData
        });

        return incident;
    });

    // Send service-level notifications for status changes
    // Uses user preferences for each recipient
    try {
        const { sendServiceNotifications } = await import('@/lib/user-notifications');
        if (status === 'ACKNOWLEDGED') {
            await sendServiceNotifications(id, 'acknowledged');
        } else if (status === 'RESOLVED') {
            await sendServiceNotifications(id, 'resolved');
        } else if (status === 'OPEN' && currentIncident?.status !== 'OPEN') {
            // Status changed to OPEN (e.g., from snoozed/acknowledged)
            await sendServiceNotifications(id, 'updated');
        }
    } catch (e) {
        console.error('Service notification failed:', e);
    }

    revalidatePath(`/incidents/${id}`);
    revalidatePath('/incidents');
    revalidatePath('/');
}

export async function resolveIncidentWithNote(id: string, resolution: string) {
    try {
        // Check resource-level authorization
        await assertCanModifyIncident(id);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    const trimmedResolution = resolution?.trim();
    const minLength = 10;
    const maxLength = 1000;

    if (!trimmedResolution || trimmedResolution.length < minLength) {
        throw new Error(`Resolution note must be at least ${minLength} characters.`);
    }

    if (trimmedResolution.length > maxLength) {
        throw new Error(`Resolution note must be ${maxLength} characters or fewer.`);
    }
    const user = await getCurrentUser();

    await prisma.$transaction(async (tx) => {
        // Get current incident to check if we're setting resolvedAt for the first time
        const currentIncident = await tx.incident.findUnique({ where: { id } });
        if (!currentIncident) {
            throw new Error('Incident not found.');
        }

        await tx.incident.update({
            where: { id },
            data: {
                status: 'RESOLVED',
                // Stop escalation when resolved
                escalationStatus: 'COMPLETED',
                nextEscalationAt: null,
                // Track SLA timestamp
                ...(!currentIncident.resolvedAt ? {
                    resolvedAt: new Date()
                } : {}),
                events: {
                    create: {
                        message: trimmedResolution ? `Resolved: ${trimmedResolution}` : 'Resolved (escalation stopped)'
                    }
                }
            }
        });

        if (trimmedResolution && user) {
            await tx.incidentNote.create({
                data: {
                    incidentId: id,
                    userId: user.id,
                    content: `Resolution: ${trimmedResolution}`
                }
            });

            await tx.incidentEvent.create({
                data: {
                    incidentId: id,
                    message: `Resolution note added by ${user.name}`
                }
            });
        }
    });

    // Send service-level notifications for resolution
    // Uses user preferences for each recipient
    try {
        const { sendServiceNotifications } = await import('@/lib/user-notifications');
        await sendServiceNotifications(id, 'resolved');
    } catch (e) {
        console.error('Service notification failed:', e);
    }

    revalidatePath(`/incidents/${id}`);
    revalidatePath('/incidents');
    revalidatePath('/');
}

export async function updateIncidentUrgency(id: string, urgency: string) {
    try {
        // Check resource-level authorization
        await assertCanModifyIncident(id);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    const parsedUrgency: IncidentUrgency = urgency === 'LOW' ? 'LOW' : 'HIGH';
    await prisma.incident.update({
        where: { id },
        data: {
            urgency: parsedUrgency,
            events: {
                create: {
                    message: `Urgency updated to ${parsedUrgency}`
                }
            }
        }
    });

    revalidatePath(`/incidents/${id}`);
    revalidatePath('/incidents');
    revalidatePath('/');
}

export async function createIncident(formData: FormData) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const urgency = formData.get('urgency') as any;
    const serviceId = formData.get('serviceId') as string;
    const priority = formData.get('priority') as string | null;
    const dedupKey = formData.get('dedupKey') as string | null;
    const assigneeId = formData.get('assigneeId') as string | null;
    const notifyOnCall = formData.get('notifyOnCall') === 'on';
    const notifySlack = formData.get('notifySlack') === 'on';

    // Extract custom field values
    const customFieldEntries: Array<{ fieldId: string; value: string }> = [];
    for (const [key, value] of formData.entries()) {
        if (key.startsWith('customField_')) {
            const fieldId = key.replace('customField_', '');
            const fieldValue = value as string;
            if (fieldValue && fieldValue.trim()) {
                customFieldEntries.push({ fieldId, value: fieldValue.trim() });
            }
        }
    }

    const incident = await prisma.$transaction(async (tx) => {
        let assigneeName: string | null = null;
        if (assigneeId && assigneeId.length) {
            const assignee = await tx.user.findUnique({
                where: { id: assigneeId },
                select: { name: true }
            });
            assigneeName = assignee?.name || null;
        }

        const createdIncident = await tx.incident.create({
            data: {
                title,
                description,
                urgency,
                serviceId,
                priority: priority && priority.length ? priority : null,
                dedupKey: dedupKey && dedupKey.length ? dedupKey : null,
                assigneeId: assigneeId && assigneeId.length ? assigneeId : null,
                events: {
                    create: {
                        message: assigneeId 
                            ? `Incident created with ${urgency} urgency and assigned to ${assigneeName || 'user'}`
                            : `Incident created with ${urgency} urgency`
                    }
                },
                // Create custom field values
                customFieldValues: {
                    create: customFieldEntries.map(({ fieldId, value }) => ({
                        customFieldId: fieldId,
                        value,
                    })),
                },
            }
        });

        if (notifyOnCall || notifySlack) {
            await tx.incidentEvent.create({
                data: {
                    incidentId: createdIncident.id,
                    message: `Notifications: ${[
                        notifyOnCall ? 'On-call' : null,
                        notifySlack ? 'Service channel' : null
                    ].filter(Boolean).join(', ')}`
                }
            });
        }

        return createdIncident;
    });

    // Send service-level notifications for new incident
    // Uses user preferences for each recipient
    try {
        const { sendServiceNotifications } = await import('@/lib/user-notifications');
        await sendServiceNotifications(incident.id, 'triggered');
    } catch (e) {
        console.error('Service notification failed:', e);
    }

    // Execute escalation policy if service has one
    try {
        const { executeEscalation } = await import('@/lib/escalation');
        await executeEscalation(incident.id);
    } catch (e) {
        console.error('Escalation failed:', e);
    }

    revalidatePath('/incidents');
    revalidatePath('/');
    redirect('/incidents');
}

export async function addNote(incidentId: string, content: string) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    const user = await getCurrentUser();

    await prisma.$transaction(async (tx) => {
        await tx.incidentNote.create({
            data: {
                incidentId,
                userId: user.id,
                content
            }
        });

        await tx.incidentEvent.create({
            data: {
                incidentId,
                message: `Note added by ${user.name}`
            }
        });
    });

    revalidatePath(`/incidents/${incidentId}`);
}

export async function reassignIncident(incidentId: string, assigneeId: string) {
    try {
        // Check resource-level authorization
        await assertCanModifyIncident(incidentId);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    
    // Handle unassigning (empty assigneeId)
    if (!assigneeId || assigneeId.trim() === '') {
        await prisma.$transaction(async (tx) => {
            await tx.incident.update({
                where: { id: incidentId },
                data: { assigneeId: null }
            });

            await tx.incidentEvent.create({
                data: {
                    incidentId,
                    message: 'Incident unassigned'
                }
            });
        });

        revalidatePath(`/incidents/${incidentId}`);
        revalidatePath('/incidents');
        return;
    }

    // Handle assigning to a user
    await prisma.$transaction(async (tx) => {
        const assigneeRecord = await tx.user.findUnique({ where: { id: assigneeId } });
        if (!assigneeRecord) {
            throw new Error('Assignee not found');
        }

        await tx.incident.update({
            where: { id: incidentId },
            data: { assigneeId }
        });

        await tx.incidentEvent.create({
            data: {
                incidentId,
                message: `Incident manually reassigned to ${assigneeRecord.name}`
            }
        });

    });

    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath('/incidents');
}

export async function addWatcher(incidentId: string, userId: string, role: string) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    if (!userId) return;

    await prisma.$transaction(async (tx) => {
        await tx.incidentWatcher.upsert({
            where: {
                incidentId_userId: {
                    incidentId,
                    userId
                }
            },
            update: {
                role: role || 'FOLLOWER'
            },
            create: {
                incidentId,
                userId,
                role: role || 'FOLLOWER'
            }
        });

        await tx.incidentEvent.create({
            data: {
                incidentId,
                message: `Watcher added (${role || 'FOLLOWER'})`
            }
        });
    });

    revalidatePath(`/incidents/${incidentId}`);
}

export async function removeWatcher(incidentId: string, watcherId: string) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    await prisma.$transaction(async (tx) => {
        await tx.incidentWatcher.delete({
            where: { id: watcherId }
        });

        await tx.incidentEvent.create({
            data: {
                incidentId,
                message: 'Watcher removed'
            }
        });
    });

    revalidatePath(`/incidents/${incidentId}`);
}
