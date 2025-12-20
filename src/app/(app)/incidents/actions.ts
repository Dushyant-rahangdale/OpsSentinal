'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { IncidentStatus, IncidentUrgency } from '@prisma/client';
import { notifySlackForIncident } from '@/lib/slack';

export async function updateIncidentStatus(id: string, status: IncidentStatus) {
    await prisma.incident.update({
        where: { id },
        data: {
            status,
            events: {
                create: {
                    message: `Status updated to ${status}`
                }
            }
        }
    });

    // Send Slack notification for acknowledge/resolve
    if (status === 'ACKNOWLEDGED') {
        notifySlackForIncident(id, 'acknowledged').catch(console.error);
    } else if (status === 'RESOLVED') {
        notifySlackForIncident(id, 'resolved').catch(console.error);
    }

    revalidatePath(`/incidents/${id}`);
    revalidatePath('/incidents');
    revalidatePath('/');
}

export async function resolveIncidentWithNote(id: string, resolution: string) {
    const trimmedResolution = resolution?.trim();
    const minLength = 10;
    const maxLength = 1000;

    if (!trimmedResolution || trimmedResolution.length < minLength) {
        throw new Error(`Resolution note must be at least ${minLength} characters.`);
    }

    if (trimmedResolution.length > maxLength) {
        throw new Error(`Resolution note must be ${maxLength} characters or fewer.`);
    }
    const user = await prisma.user.findFirst();

    await prisma.incident.update({
        where: { id },
        data: {
            status: 'RESOLVED',
            events: {
                create: {
                    message: trimmedResolution ? `Resolved: ${trimmedResolution}` : 'Resolved'
                }
            }
        }
    });

    if (trimmedResolution && user) {
        await prisma.incidentNote.create({
            data: {
                incidentId: id,
                userId: user.id,
                content: `Resolution: ${trimmedResolution}`
            }
        });

        await prisma.incidentEvent.create({
            data: {
                incidentId: id,
                message: `Resolution note added by ${user.name}`
            }
        });
    }

    notifySlackForIncident(id, 'resolved').catch(console.error);

    revalidatePath(`/incidents/${id}`);
    revalidatePath('/incidents');
    revalidatePath('/');
}

export async function updateIncidentUrgency(id: string, urgency: string) {
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
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const urgency = formData.get('urgency') as any;
    const serviceId = formData.get('serviceId') as string;
    const priority = formData.get('priority') as string | null;
    const dedupKey = formData.get('dedupKey') as string | null;
    const source = formData.get('source') as string | null;
    const notifyOnCall = formData.get('notifyOnCall') === 'on';
    const notifySlack = formData.get('notifySlack') === 'on';

    const incident = await prisma.incident.create({
        data: {
            title,
            description,
            urgency,
            serviceId,
            priority: priority && priority.length ? priority : null,
            dedupKey: dedupKey && dedupKey.length ? dedupKey : null,
            events: {
                create: {
                    message: `Incident created with ${urgency} urgency${source ? ` via ${source}` : ''}`
                }
            }
        }
    });

    if (notifyOnCall || notifySlack) {
        await prisma.incidentEvent.create({
            data: {
                incidentId: incident.id,
                message: `Notifications: ${[
                    notifyOnCall ? 'On-call' : null,
                    notifySlack ? 'Service channel' : null
                ].filter(Boolean).join(', ')}`
            }
        });
    }

    // Send Slack notification for new incident
    notifySlackForIncident(incident.id, 'triggered').catch(console.error);

    revalidatePath('/incidents');
    revalidatePath('/');
    redirect('/incidents');
}

export async function addNote(incidentId: string, content: string) {
    // Mock user for now - in real app would match session
    const user = await prisma.user.findFirst();
    if (!user) return;

    await prisma.incidentNote.create({
        data: {
            incidentId,
            userId: user.id,
            content
        }
    });

    await prisma.incidentEvent.create({
        data: {
            incidentId,
            message: `Note added by ${user.name}`
        }
    });

    revalidatePath(`/incidents/${incidentId}`);
}

export async function reassignIncident(incidentId: string, assigneeId: string) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) return;

    await prisma.incident.update({
        where: { id: incidentId },
        data: { assigneeId }
    });

    await prisma.incidentEvent.create({
        data: {
            incidentId,
            message: `Incident manually reassigned to ${assignee.name}`
        }
    });

    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath('/incidents');
}

export async function addWatcher(incidentId: string, userId: string, role: string) {
    if (!userId) return;

    await prisma.incidentWatcher.upsert({
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

    await prisma.incidentEvent.create({
        data: {
            incidentId,
            message: `Watcher added (${role || 'FOLLOWER'})`
        }
    });

    revalidatePath(`/incidents/${incidentId}`);
}

export async function removeWatcher(incidentId: string, watcherId: string) {
    await prisma.incidentWatcher.delete({
        where: { id: watcherId }
    });

    await prisma.incidentEvent.create({
        data: {
            incidentId,
            message: 'Watcher removed'
        }
    });

    revalidatePath(`/incidents/${incidentId}`);
}
