/**
 * Slack Webhook Integration
 * Sends notifications to Slack when incidents are created, acknowledged, or resolved.
 */

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
    triggered: '🚨',
    acknowledged: '👀',
    resolved: '✅'
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

    const emoji = STATUS_EMOJI[eventType] || '📢';
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
                                    text: '🔗 View Incident',
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
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Slack] Webhook failed:', errorText);
            return { success: false, error: errorText };
        }

        console.log(`[Slack] Notification sent via ${webhookUrl ? 'Service' : 'Global'} Webhook: ${eventType} - ${incident.title}`);
        return { success: true };
    } catch (error: any) {
        console.error('[Slack] Webhook error:', error.message);
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
