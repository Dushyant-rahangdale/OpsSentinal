/**
 * Service-Level Notification System (ISOLATED)
 * 
 * IMPORTANT: Service notifications are completely isolated from:
 * - User preferences (users cannot disable service notifications)
 * - Escalation policies (service notifications are separate)
 * 
 * Service notifications use ONLY service-configured channels:
 * - SLACK: Service Slack webhook/channel
 * - WEBHOOK: Service webhook integrations (Google Chat, Teams, Discord, etc.)
 * 
 * These are triggered when incidents are created, acknowledged, resolved, or updated
 */

import prisma from './prisma';
import { NotificationChannel } from './notifications';
import { notifySlackForIncident, sendSlackMessageToChannel } from './slack';
import { sendIncidentWebhook } from './webhooks';
import { logger } from './logger';

/**
 * Send service-level notifications for an incident event
 * 
 * COMPLETELY ISOLATED from user preferences and escalation logic.
 * Uses ONLY service-configured channels (serviceNotificationChannels).
 * 
 * Supported channels:
 * - SLACK: Sends to service Slack channel/webhook
 * - WEBHOOK: Sends to all enabled webhook integrations for the service
 */
export async function sendServiceNotifications(
    incidentId: string,
    eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated'
): Promise<{ success: boolean; errors?: string[] }> {
    try {
        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
            include: {
                service: {
                    include: {
                        webhookIntegrations: {
                            where: { enabled: true }
                        }
                    }
                },
                assignee: true
            }
        });

        if (!incident || !incident.service) {
            return { success: false, errors: ['Incident or service not found'] };
        }

        // Get service-configured notification channels (isolated from user preferences)
        const serviceChannels = incident.service.serviceNotificationChannels || [];
        const errors: string[] = [];

        // Handle SLACK channel
        if (serviceChannels.includes('SLACK')) {
            try {
                // Try Slack API first (if channel is configured)
                if (incident.service.slackChannel) {
                    const slackResult = await sendSlackMessageToChannel(
                        incident.service.slackChannel,
                        {
                            id: incident.id,
                            title: incident.title,
                            status: incident.status,
                            urgency: incident.urgency,
                            serviceName: incident.service.name,
                            assigneeName: incident.assignee?.name
                        },
                        eventType === 'triggered' ? 'triggered' : 
                        eventType === 'acknowledged' ? 'acknowledged' : 
                        eventType === 'resolved' ? 'resolved' : 'triggered',
                        true, // includeInteractiveButtons
                        incident.serviceId // Pass serviceId to get correct token
                    );
                    
                    if (!slackResult.success) {
                        errors.push(`Slack channel notification failed: ${slackResult.error}`);
                    }
                } 
                // Fallback to webhook if channel not configured but webhook URL exists
                else if (incident.service.slackWebhookUrl && eventType !== 'updated') {
                    await notifySlackForIncident(incidentId, 
                        eventType === 'triggered' ? 'triggered' : 
                        eventType === 'acknowledged' ? 'acknowledged' : 
                        'resolved'
                    ).catch(err => {
                        errors.push(`Slack webhook notification failed: ${err.message}`);
                    });
                }
            } catch (error: any) {
                logger.error('Slack notification error', {
                    incidentId,
                    error: error.message
                });
                errors.push(`Slack notification failed: ${error.message}`);
            }
        }

        // Handle WEBHOOK channel - send to all enabled webhook integrations
        if (serviceChannels.includes('WEBHOOK')) {
            const webhookPromises = incident.service.webhookIntegrations.map(async (webhook) => {
                try {
                    const webhookEventType = eventType === 'triggered' ? 'triggered' :
                                          eventType === 'acknowledged' ? 'acknowledged' :
                                          eventType === 'resolved' ? 'resolved' : 'updated';
                    
                    const result = await sendIncidentWebhook(
                        webhook.url,
                        incidentId,
                        webhookEventType,
                        webhook.secret || undefined,
                        webhook.type // Pass webhook type for proper formatting
                    );
                    
                    if (!result.success) {
                        return { webhookId: webhook.id, error: result.error };
                    }
                    return null;
                } catch (error: any) {
                    logger.error('Webhook notification error', {
                        incidentId,
                        webhookId: webhook.id,
                        error: error.message
                    });
                    return { webhookId: webhook.id, error: error.message };
                }
            });

            const webhookResults = await Promise.all(webhookPromises);
            for (const result of webhookResults) {
                if (result) {
                    errors.push(`Webhook ${result.webhookId} failed: ${result.error}`);
                }
            }
        }

        // Also send to legacy webhookUrl if configured (for backward compatibility)
        if (incident.service.webhookUrl && !serviceChannels.includes('WEBHOOK')) {
            try {
                const webhookEventType = eventType === 'triggered' ? 'triggered' :
                                      eventType === 'acknowledged' ? 'acknowledged' :
                                      eventType === 'resolved' ? 'resolved' : 'updated';
                
                const result = await sendIncidentWebhook(
                    incident.service.webhookUrl,
                    incidentId,
                    webhookEventType
                );
                
                if (!result.success) {
                    errors.push(`Legacy webhook failed: ${result.error}`);
                }
            } catch (error: any) {
                logger.error('Legacy webhook notification error', {
                    incidentId,
                    error: error.message
                });
                errors.push(`Legacy webhook failed: ${error.message}`);
            }
        }

        return { 
            success: errors.length === 0, 
            errors: errors.length > 0 ? errors : undefined 
        };
    } catch (error: any) {
        logger.error('Service notification error', {
            incidentId,
            error: error.message
        });
        return { success: false, errors: [error.message] };
    }
}

/**
 * Notification Flow Summary:
 * 
 * 1. **Escalation Policy Notifications** (via executeEscalation):
 *    - Triggered when escalation steps execute
 *    - Uses notification channels configured per escalation step
 *    - Sends to users/teams/schedules defined in the escalation step
 *    - Configured in EscalationRule.notificationChannels
 * 
 * 2. **Service-Level Notifications** (via sendServiceNotifications):
 *    - Triggered when incidents are created, acknowledged, resolved, or updated
 *    - Uses notification channels configured at the service level
 *    - Sends to service team members and assignee
 *    - Configured in Service.notificationChannels
 *    - Slack uses service.slackWebhookUrl
 * 
 * 3. **Both can work together**:
 *    - Service notifications: Immediate notification to team when incident created
 *    - Policy notifications: Escalation-based notifications following policy steps
 */










