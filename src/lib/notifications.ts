import prisma from './prisma';
import { sendIncidentEmail } from './email';
import { retry } from './retry';

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
            status: 'PENDING',
            attempts: 0
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
                // Webhooks are typically configured per-service or per-escalation-policy
                // For now, we'll need the webhook URL from the escalation policy or service
                // This is a placeholder - webhook URLs should be stored in escalation policy config
                const { sendIncidentWebhook } = await import('./webhooks');
                const incidentForWebhook = await prisma.incident.findUnique({ 
                    where: { id: incidentId },
                    include: { service: true }
                });
                
                if (!incidentForWebhook) {
                    result = { success: false, error: 'Incident not found' };
                    break;
                }
                
                // Try to get webhook URL from service or escalation policy
                // For now, we'll check if there's a webhook URL in the service config
                // In a full implementation, this would come from the escalation policy
                const webhookUrl = incidentForWebhook.service.webhookUrl;
                
                if (!webhookUrl) {
                    result = { success: false, error: 'No webhook URL configured for this service' };
                    break;
                }
                
                const eventTypeWebhook = incidentForWebhook.status === 'RESOLVED' ? 'resolved' :
                                        incidentForWebhook.status === 'ACKNOWLEDGED' ? 'acknowledged' : 'triggered';
                
                const webhookResult = await sendIncidentWebhook(
                    webhookUrl,
                    incidentId,
                    eventTypeWebhook
                );
                
                result = webhookResult.success 
                    ? { success: true }
                    : { success: false, error: webhookResult.error };
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
                errorMsg: error.message,
                attempts: (notification.attempts || 0) + 1
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
