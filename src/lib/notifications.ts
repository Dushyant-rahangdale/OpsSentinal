import prisma from './prisma';
import { sendIncidentEmail } from './email';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'SLACK' | 'WEBHOOK';

/**
 * Send notifications to escalation policy targets for an incident.
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

    try {
        let result: { success: boolean; error?: string };

        // Route to appropriate notification service
        switch (channel) {
            case 'EMAIL':
                // Determine event type from message or incident status
                const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
                const eventType = incident?.status === 'RESOLVED' ? 'resolved' :
                                 incident?.status === 'ACKNOWLEDGED' ? 'acknowledged' : 'triggered';
                result = await sendIncidentEmail(userId, incidentId, eventType);
                break;
            
            case 'SMS':
                const { sendIncidentSMS } = await import('./sms');
                const incidentForSMS = await prisma.incident.findUnique({ where: { id: incidentId } });
                const eventTypeSMS = incidentForSMS?.status === 'RESOLVED' ? 'resolved' :
                                    incidentForSMS?.status === 'ACKNOWLEDGED' ? 'acknowledged' : 'triggered';
                result = await sendIncidentSMS(userId, incidentId, eventTypeSMS);
                break;
            
            case 'PUSH':
                const { sendIncidentPush } = await import('./push');
                const incidentForPush = await prisma.incident.findUnique({ where: { id: incidentId } });
                const eventTypePush = incidentForPush?.status === 'RESOLVED' ? 'resolved' :
                                     incidentForPush?.status === 'ACKNOWLEDGED' ? 'acknowledged' : 'triggered';
                result = await sendIncidentPush(userId, incidentId, eventTypePush);
                break;
            
            case 'SLACK':
                // Slack is handled separately via slack.ts
                result = { success: true };
                break;
            
            case 'WEBHOOK':
                // TODO: Implement webhook notifications
                result = { success: false, error: 'Webhook notifications not yet implemented' };
                break;
            
            default:
                result = { success: false, error: `Unknown channel: ${channel}` };
        }

        if (result.success) {
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
            throw new Error(result.error || 'Notification delivery failed');
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
