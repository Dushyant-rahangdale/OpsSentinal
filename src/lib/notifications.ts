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
 * Re-exported from escalation.ts for backward compatibility
 */
export { executeEscalation } from './escalation';
