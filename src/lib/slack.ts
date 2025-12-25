/**
 * Slack Integration
 * Supports both webhook and Slack API methods for sending notifications.
 * Includes interactive buttons for ack/resolve actions.
 */

import prisma from './prisma';
import { logger } from './logger';
import { getBaseUrl } from './env-validation';
import { retryFetch, isRetryableHttpError } from './retry';
import { decrypt } from './encryption';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN; // Bot token for Slack API (fallback)

/**
 * Get Slack bot token for a service (from OAuth integration or env fallback)
 */
async function getSlackBotToken(serviceId?: string): Promise<string | null> {
    // Try to get from service-specific integration first
    if (serviceId) {
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                slackIntegration: true
            }
        });

        if (service?.slackIntegration?.enabled && service.slackIntegration.botToken) {
            // Decrypt token
            try {
                return decrypt(service.slackIntegration.botToken);
            } catch (error) {
                logger.error('[Slack] Failed to decrypt token', { serviceId, error });
            }
        }
    }

    // Try global integration (one not linked to any service)
    const globalIntegration = await prisma.slackIntegration.findFirst({
        where: { 
            enabled: true,
            service: null // Not linked to any service
        }
    });

    if (globalIntegration?.botToken) {
        try {
            return decrypt(globalIntegration.botToken);
        } catch (error) {
            logger.error('[Slack] Failed to decrypt global token', { error });
        }
    }

    // Fallback to environment variable
    return SLACK_BOT_TOKEN || null;
}

export type SlackEventType = 'triggered' | 'acknowledged' | 'resolved';

interface IncidentDetails {
    id: string;
    title: string;
    status: string;
    urgency: string;
    serviceName: string;
    assigneeName?: string;
}

interface SlackBlock {
    type: string;
    [key: string]: any;
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
    const appUrl = getBaseUrl();
    const incidentUrl = `${appUrl}/incidents/${incident.id}`;

    const blocks = buildSlackBlocks(incident, eventType, additionalMessage, false); // No interactive buttons in webhook mode

    const payload = {
        attachments: [
            {
                color,
                blocks
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

/**
 * Build Slack message blocks with interactive buttons
 */
function buildSlackBlocks(
    incident: IncidentDetails,
    eventType: SlackEventType,
    additionalMessage?: string,
    includeInteractiveButtons: boolean = true
): SlackBlock[] {
    const emoji = STATUS_EMOJI[eventType] || ':information_source:';
    const appUrl = getBaseUrl();
    const incidentUrl = `${appUrl}/incidents/${incident.id}`;

    const blocks: SlackBlock[] = [
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
        }
    ];

    if (additionalMessage) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: additionalMessage
            }
        });
    }

    // Add interactive buttons for ack/resolve (only for triggered/acknowledged incidents)
    if (includeInteractiveButtons && (eventType === 'triggered' || eventType === 'acknowledged')) {
        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Acknowledge',
                        emoji: true
                    },
                    style: 'primary',
                    value: JSON.stringify({ action: 'ack', incidentId: incident.id }),
                    action_id: 'ack_incident'
                },
                ...(eventType === 'acknowledged' ? [{
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Resolve',
                        emoji: true
                    },
                    style: 'danger',
                    value: JSON.stringify({ action: 'resolve', incidentId: incident.id }),
                    action_id: 'resolve_incident'
                }] : [])
            ]
        });
    }

    blocks.push({
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
    });

    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: `*OpsGuard* | Incident #${incident.id.slice(-5).toUpperCase()}`
            }
        ]
    });

    return blocks;
}

/**
 * Send message to Slack channel via Slack API (not webhook)
 */
export async function sendSlackMessageToChannel(
    channel: string,
    incident: IncidentDetails,
    eventType: SlackEventType,
    includeInteractiveButtons: boolean = true,
    serviceId?: string
): Promise<{ success: boolean; error?: string }> {
    // Get bot token (from OAuth integration or env fallback)
    const botToken = await getSlackBotToken(serviceId);
    
    if (!botToken) {
        logger.warn('[Slack] No bot token configured, falling back to webhook');
        // Fallback to webhook if API token not available
        return sendSlackNotification(eventType, incident, undefined, undefined);
    }

    const color = STATUS_COLORS[eventType] || '#757575';
    const blocks = buildSlackBlocks(incident, eventType, undefined, includeInteractiveButtons);

    const payload = {
        channel: channel.startsWith('#') ? channel : `#${channel}`,
        blocks,
        attachments: [
            {
                color
            }
        ]
    };

    try {
        const response = await retryFetch(
            'https://slack.com/api/chat.postMessage',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${botToken}`
                },
                body: JSON.stringify(payload)
            },
            {
                maxAttempts: 3,
                initialDelayMs: 1000,
                retryableErrors: (error) => {
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

        const responseData = await response.json();

        if (!response.ok || !responseData.ok) {
            const errorMsg = responseData.error || `HTTP ${response.status}`;
            logger.error('[Slack] API call failed', { error: errorMsg, channel });
            return { success: false, error: errorMsg };
        }

        logger.info(`[Slack] Message sent to channel ${channel} via API: ${eventType} - ${incident.title}`);
        return { success: true };
    } catch (error: any) {
        logger.error('[Slack] API error', { error: error.message, channel });
        return { success: false, error: error.message };
    }
}

/**
 * Send interactive Slack message with ack/resolve buttons
 */
export async function sendSlackInteractiveMessage(
    channel: string,
    incidentId: string,
    eventType: SlackEventType,
    serviceId?: string
): Promise<{ success: boolean; error?: string }> {
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

    const incidentDetails: IncidentDetails = {
        id: incident.id,
        title: incident.title,
        status: incident.status,
        urgency: incident.urgency,
        serviceName: incident.service.name,
        assigneeName: incident.assignee?.name
    };

    return sendSlackMessageToChannel(channel, incidentDetails, eventType, true, serviceId || incident.serviceId);
}
