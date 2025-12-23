/**
 * Service-Level Notification System
 * Handles notifications that are sent at the service level (not through escalation policies)
 * These are triggered when incidents are created, updated, or resolved
 */

import prisma from './prisma';
import { sendNotification, NotificationChannel } from './notifications';
import { notifySlackForIncident } from './slack';

/**
 * Send service-level notifications for an incident event
 * Uses the service's configured notification channels
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
                        team: {
                            include: {
                                members: {
                                    include: { user: true }
                                }
                            }
                        }
                    }
                },
                assignee: true
            }
        });

        if (!incident || !incident.service) {
            return { success: false, errors: ['Incident or service not found'] };
        }

        // Get notification channels from service configuration
        const channels: NotificationChannel[] = (incident.service.notificationChannels as NotificationChannel[]) || ['EMAIL', 'SLACK'];
        const errors: string[] = [];

        // Determine who to notify
        const recipients: string[] = [];
        
        // Add assignee if exists
        if (incident.assigneeId) {
            recipients.push(incident.assigneeId);
        }
        
        // Add service team members if team exists
        if (incident.service.team) {
            const teamUserIds = incident.service.team.members.map(m => m.userId);
            recipients.push(...teamUserIds);
        }

        // Remove duplicates
        const uniqueRecipients = [...new Set(recipients)];

        if (uniqueRecipients.length === 0) {
            // No specific recipients, but still send service-level notifications (e.g., Slack)
            // Only send Slack if configured
            if (channels.includes('SLACK') && incident.service.slackWebhookUrl) {
                await notifySlackForIncident(incidentId, eventType).catch(err => {
                    errors.push(`Slack notification failed: ${err.message}`);
                });
            }
            return { success: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
        }

        // Send notifications to each recipient via each channel
        for (const userId of uniqueRecipients) {
            for (const channel of channels) {
                // Skip SLACK channel here - it's handled separately via service webhook
                if (channel === 'SLACK') {
                    continue; // Slack is sent via service webhook, not per-user
                }

                const message = `[${incident.service.name}] Incident ${eventType}: ${incident.title}`;
                const result = await sendNotification(incidentId, userId, channel, message);
                
                if (!result.success) {
                    errors.push(`${channel} notification to user ${userId} failed: ${result.error}`);
                }
            }
        }

        // Send service-level Slack notification (if configured)
        if (channels.includes('SLACK') && incident.service.slackWebhookUrl) {
            await notifySlackForIncident(incidentId, eventType).catch(err => {
                errors.push(`Slack notification failed: ${err.message}`);
            });
        }

        return { 
            success: errors.length === 0, 
            errors: errors.length > 0 ? errors : undefined 
        };
    } catch (error: any) {
        console.error('Service notification error:', error);
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








