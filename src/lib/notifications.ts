import prisma from './prisma';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'SLACK' | 'WEBHOOK';

/**
 * Send notifications to escalation policy targets for an incident.
 * This is a mock implementation - in production, integrate with actual providers.
 */
export async function sendNotification(
    incidentId: string,
    userId: string,
    channel: NotificationChannel,
    message: string
) {
    // Create notification record
    const notification = await prisma.notification.create({
        data: {
            incidentId,
            userId,
            channel,
            message,
            status: 'PENDING'
        }
    });

    // Mock: Simulate sending (in production, call external APIs)
    try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mock success (90% success rate for demo)
        const success = Math.random() > 0.1;

        if (success) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            });

            // Log to incident timeline
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `Notification sent via ${channel}`
                }
            });

            return { success: true, notificationId: notification.id };
        } else {
            throw new Error('Simulated delivery failure');
        }
    } catch (error: any) {
        await prisma.notification.update({
            where: { id: notification.id },
            data: {
                status: 'FAILED',
                failedAt: new Date(),
                errorMsg: error.message
            }
        });

        return { success: false, error: error.message, notificationId: notification.id };
    }
}

/**
 * Execute escalation policy for an incident.
 * Notifies the first level target.
 */
export async function executeEscalation(incidentId: string) {
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

    // Get first escalation step
    const firstStep = incident.service.policy.steps[0];
    const targetUser = firstStep.targetUser;

    // Send notification (defaulting to EMAIL for now)
    const result = await sendNotification(
        incidentId,
        targetUser.id,
        'EMAIL',
        `[OpsGuard] Incident: ${incident.title}`
    );

    // Assign incident to target user
    await prisma.incident.update({
        where: { id: incidentId },
        data: { assigneeId: targetUser.id }
    });

    await prisma.incidentEvent.create({
        data: {
            incidentId,
            message: `Escalated to ${targetUser.name} (Level 1)`
        }
    });

    return { escalated: true, targetUser: targetUser.name, notification: result };
}
