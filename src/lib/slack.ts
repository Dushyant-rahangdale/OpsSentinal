/**
 * Slack Webhook Integration
 * Sends notifications to Slack when incidents are created, acknowledged, or resolved.
 */

import { retryFetch, isRetryableHttpError } from './retry';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export type SlackEventType = 'triggered' | 'acknowledged' | 'resolved';

interface IncidentDetails {
    id: string;
    title: string;
    status: string;
    urgency: string;
    serviceName: string;
    assigneeName?: string;
}

const STATUS_COLORS: Record<string, string> = {
    triggered: '#d32f2f',  // Red for new incidents
    acknowledged: '#f9a825', // Amber for acknowledged
    resolved: '#388e3c'      // Green for resolved
};

const STATUS_EMOJI: Record<string, string> = {
    triggered: ':rotating_light:',
    acknowledged: ':warning:',
    resolved: ':white_check_mark:'
};

/**
 * Send a Slack webhook notification for incident events
 */
export async function sendSlackNotification(
    eventType: SlackEventType,
    incident: IncidentDetails,
    additionalMessage?: string,
    webhookUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
    const targetUrl = webhookUrl || SLACK_WEBHOOK_URL;

    if (!targetUrl) {
        console.log('[Slack] No webhook URL configured (global or service-level), skipping notification');
        return { success: false, error: 'No Slack webhook URL configured' };
    }

    const emoji = STATUS_EMOJI[eventType] || ':information_source:';
    const color = STATUS_COLORS[eventType] || '#757575';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const incidentUrl = `${appUrl}/incidents/${incident.id}`;

    const payload = {
        attachments: [
            {
                color,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `${emoji} Incident ${eventType.toUpperCase()}: ${incident.title}`,
                            emoji: true
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Service:*\n${incident.serviceName}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Urgency:*\n${incident.urgency}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Status:*\n${incident.status}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Assignee:*\n${incident.assigneeName || 'Unassigned'}`
                            }
                        ]
                    },
                    ...(additionalMessage ? [{
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: additionalMessage
                        }
                    }] : []),
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: 'View Incident',
                                    emoji: true
                                },
                                url: incidentUrl,
                                style: 'primary'
                            }
                        ]
                    },
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: `*OpsGuard* | Incident #${incident.id.slice(-5).toUpperCase()}`
                            }
                        ]
                    }
                ]
            }
        ]
    };

    try {
        // Use retry logic for improved reliability
        const response = await retryFetch(
            targetUrl,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            },
            {
                maxAttempts: 3,
                initialDelayMs: 1000,
                retryableErrors: (error) => {
                    // Only retry on network errors or 5xx server errors
                    if (error instanceof Error) {
                        return error.message.includes('fetch') || 
                               error.message.includes('network') ||
                               error.message.includes('timeout') ||
                               error.message.includes('5');
                    }
                    return false;
                }
            }
        );

        // Check for non-retryable errors (4xx client errors)
        if (!response.ok && !isRetryableHttpError(response.status)) {
            const errorText = await response.text();
            console.error('[Slack] Webhook failed (client error):', errorText);
            return { success: false, error: errorText };
        }

        if (!response.ok) {
            // This shouldn't happen after retries, but handle gracefully
            const errorText = await response.text();
            console.error('[Slack] Webhook failed after retries:', errorText);
            return { success: false, error: errorText };
        }

        console.log(`[Slack] Notification sent via ${webhookUrl ? 'Service' : 'Global'} Webhook: ${eventType} - ${incident.title}`);
        return { success: true };
    } catch (error: any) {
        console.error('[Slack] Webhook error after retries:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Helper to send Slack notification for an incident from database
 */
export async function notifySlackForIncident(
    incidentId: string,
    eventType: SlackEventType,
    additionalMessage?: string
) {
    // Dynamic import to avoid circular deps
    const prisma = (await import('./prisma')).default;

    const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
            service: true,
            assignee: true
        }
    });

    if (!incident) {
        return { success: false, error: 'Incident not found' };
    }

    return sendSlackNotification(eventType, {
        id: incident.id,
        title: incident.title,
        status: incident.status,
        urgency: incident.urgency,
        serviceName: incident.service.name,
        assigneeName: incident.assignee?.name
    }, additionalMessage, incident.service.slackWebhookUrl); // Pass service-level webhook
}
