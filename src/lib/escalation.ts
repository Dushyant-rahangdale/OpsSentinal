import prisma from './prisma';
import { sendNotification, NotificationChannel } from './notifications';
import { buildScheduleBlocks } from './oncall';

/**
 * Get the current on-call user for a schedule at a given time
 */
async function getOnCallUserForSchedule(scheduleId: string, atTime: Date): Promise<string | null> {
    const schedule = await prisma.onCallSchedule.findUnique({
        where: { id: scheduleId },
        include: {
            layers: {
                include: {
                    users: {
                        include: { user: true },
                        orderBy: { position: 'asc' }
                    }
                }
            },
            overrides: {
                where: {
                    start: { lte: atTime },
                    end: { gt: atTime }
                },
                include: {
                    user: true
                }
            }
        }
    });

    if (!schedule || schedule.layers.length === 0) {
        return null;
    }

    // Build schedule blocks to find who's on-call
    const windowStart = new Date(atTime);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(atTime);
    windowEnd.setHours(23, 59, 59, 999);

    const blocks = buildScheduleBlocks(
        schedule.layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            start: layer.start,
            end: layer.end,
            rotationLengthHours: layer.rotationLengthHours,
            users: layer.users.map(lu => ({
                userId: lu.userId,
                user: { name: lu.user.name },
                position: lu.position
            }))
        })),
        schedule.overrides.map(override => ({
            id: override.id,
            userId: override.userId,
            user: { name: override.user.name },
            start: override.start,
            end: override.end,
            replacesUserId: override.replacesUserId
        })),
        windowStart,
        windowEnd
    );

    // Find the block that covers the current time
    const activeBlock = blocks.find(block => 
        block.start.getTime() <= atTime.getTime() && 
        block.end.getTime() > atTime.getTime()
    );

    return activeBlock?.userId || null;
}

/**
 * Get all users in a team
 */
async function getTeamUsers(teamId: string): Promise<string[]> {
    const members = await prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true }
    });
    return members.map(m => m.userId);
}

/**
 * Resolve escalation target to a list of user IDs
 * Currently supports: User (direct), Team (all members), Schedule (on-call user)
 * Future: Could support Schedule (all on-call users across layers)
 */
export async function resolveEscalationTarget(
    targetType: 'USER' | 'TEAM' | 'SCHEDULE',
    targetId: string,
    atTime: Date = new Date()
): Promise<string[]> {
    switch (targetType) {
        case 'USER':
            return [targetId];
        
        case 'TEAM':
            return await getTeamUsers(targetId);
        
        case 'SCHEDULE':
            const onCallUserId = await getOnCallUserForSchedule(targetId, atTime);
            return onCallUserId ? [onCallUserId] : [];
        
        default:
            return [];
    }
}

/**
 * Execute escalation policy for an incident.
 * Handles multiple steps with delays and different target types.
 */
export async function executeEscalation(incidentId: string, stepIndex: number = 0) {
    const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
            service: {
                include: {
                    policy: {
                        include: {
                            steps: {
                                include: { targetUser: true },
                                orderBy: { stepOrder: 'asc' }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!incident?.service?.policy?.steps?.length) {
        return { escalated: false, reason: 'No escalation policy configured' };
    }

    if (stepIndex >= incident.service.policy.steps.length) {
        return { escalated: false, reason: 'All escalation steps exhausted' };
    }

    const step = incident.service.policy.steps[stepIndex];
    const targetUser = step.targetUser;

    // Send notification (defaulting to EMAIL for now)
    const result = await sendNotification(
        incidentId,
        targetUser.id,
        'EMAIL',
        `[OpsGuard] Incident: ${incident.title}${stepIndex > 0 ? ` (Escalation Level ${stepIndex + 1})` : ''}`
    );

    // Assign incident to target user (only on first step)
    if (stepIndex === 0) {
        await prisma.incident.update({
            where: { id: incidentId },
            data: { assigneeId: targetUser.id }
        });
    }

    await prisma.incidentEvent.create({
        data: {
            incidentId,
            message: `Escalated to ${targetUser.name} (Level ${stepIndex + 1}${step.delayMinutes > 0 ? `, after ${step.delayMinutes} minute delay` : ''})`
        }
    });

    // Schedule next step if there is one
    if (stepIndex < incident.service.policy.steps.length - 1) {
        const nextStep = incident.service.policy.steps[stepIndex + 1];
        const delayMs = nextStep.delayMinutes * 60 * 1000;
        const executeAt = new Date(Date.now() + delayMs);

        // In a production system, you would use a job queue (e.g., Bull, Agenda, etc.)
        // For now, we'll just log that the next step should be executed
        // TODO: Implement proper job scheduling for delayed escalations
        
        await prisma.incidentEvent.create({
            data: {
                incidentId,
                message: `Next escalation step scheduled for ${executeAt.toLocaleString()} (${nextStep.delayMinutes} minute delay)`
            }
        });
    }

    return { 
        escalated: true, 
        targetUser: targetUser.name, 
        stepIndex,
        notification: result,
        nextStepScheduled: stepIndex < incident.service.policy.steps.length - 1
    };
}

/**
 * Check and execute pending escalations
 * This should be called periodically (e.g., via cron job) to process delayed escalations
 */
export async function processPendingEscalations() {
    // This is a placeholder for future implementation
    // In production, you would:
    // 1. Query for incidents that need escalation (based on scheduled times)
    // 2. Check if incident is still unacknowledged
    // 3. Execute the next escalation step
    // 4. Schedule the next step if applicable
    
    // For now, this is a no-op
    return { processed: 0 };
}

