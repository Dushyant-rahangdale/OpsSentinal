'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { assertResponderOrAbove, getCurrentUser } from '@/lib/rbac';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

export async function snoozeIncidentWithDuration(incidentId: string, durationMinutes: number, reason?: string) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }

    const snoozedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    const user = await getCurrentUser();
    const userTimeZone = getUserTimeZone(user);

    await prisma.incident.update({
        where: { id: incidentId },
        data: {
            status: 'SNOOZED',
            snoozedUntil,
            snoozeReason: reason || null,
            escalationStatus: 'PAUSED',
            nextEscalationAt: null,
            events: {
                create: {
                    message: `Incident snoozed until ${formatDateTime(snoozedUntil, userTimeZone, { format: 'datetime' })}${reason ? ` (Reason: ${reason})` : ''}${user ? ` by ${user.name}` : ''}`
                }
            }
        }
    });

    // Schedule auto-unsnooze job using PostgreSQL job queue
    try {
        const { scheduleAutoUnsnooze } = await import('@/lib/jobs/queue');
        await scheduleAutoUnsnooze(incidentId, snoozedUntil);
    } catch (error) {
        console.error(`Failed to schedule auto-unsnooze job for incident ${incidentId}:`, error);
        // Continue anyway - cron job will pick it up via snoozedUntil field
    }

    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath('/incidents');
    revalidatePath('/');
}

export async function processAutoUnsnooze() {
    const now = new Date();
    const incidentsToUnsnooze = await prisma.incident.findMany({
        where: {
            status: 'SNOOZED',
            snoozedUntil: { lte: now }
        },
        select: { id: true }
    });

    let processedCount = 0;
    for (const incident of incidentsToUnsnooze) {
        await prisma.incident.update({
            where: { id: incident.id },
            data: {
                status: 'OPEN',
                snoozedUntil: null,
                snoozeReason: null,
                escalationStatus: 'ESCALATING',
                nextEscalationAt: new Date(),
                events: {
                    create: {
                        message: 'Incident auto-unsnoozed (snooze duration expired)'
                    }
                }
            }
        });
        processedCount++;
    }

    return { processed: processedCount };
}



