/**
 * Webhook Notification Service
 * Sends generic webhook notifications for incidents
 *
 * Supports:
 * - Custom webhook URLs
 * - Signature verification (HMAC-SHA256)
 * - Retry logic with exponential backoff
 * - Custom payload formatting
 */

import prisma from './prisma';
import crypto from 'crypto';
import { getBaseUrl } from './env-validation';
import { retryFetch, isRetryableHttpError } from './retry';
import { logger } from './logger';

export type WebhookOptions = {
  url: string;
  payload: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  headers?: Record<string, string>;
  secret?: string; // For HMAC signature
  method?: 'POST' | 'PUT' | 'PATCH';
  timeout?: number; // Timeout in milliseconds
};

export type WebhookResult = {
  success: boolean;
  error?: string;
  statusCode?: number;
  responseBody?: string;
};

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Send webhook notification
 */
export async function sendWebhook(options: WebhookOptions): Promise<WebhookResult> {
  try {
    const {
      url,
      payload,
      headers = {},
      secret,
      method = 'POST',
      timeout = 10000, // 10 seconds default
    } = options;

    if (!url) {
      return { success: false, error: 'Webhook URL is required' };
    }

    // SSRF Protection: Validate URL
    const { validateWebhookUrl } = await import('./network-security');
    const isValid = await validateWebhookUrl(url);
    if (!isValid) {
      return { success: false, error: 'Invalid or restricted Webhook URL' };
    }

    // Stringify payload
    const payloadString = JSON.stringify(payload);

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OpsKnight/1.0',
      ...headers,
    };

    // Add signature if secret provided
    if (secret) {
      const signature = generateSignature(payloadString, secret);
      requestHeaders['X-OpsKnight-Signature'] = `sha256=${signature}`;
      requestHeaders['X-OpsKnight-Timestamp'] = Date.now().toString();
    }

    // Use retry logic for improved reliability
    // Create AbortController for timeout compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await retryFetch(
        url,
        {
          method,
          headers: requestHeaders,
          body: payloadString,
          signal: controller.signal,
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          retryableErrors: error => {
            // Only retry on network errors, timeouts, or 5xx server errors
            if (error instanceof Error) {
              if (error.name === 'AbortError' || error.message.includes('timeout')) {
                return true;
              }
              if (error.message.includes('fetch') || error.message.includes('network')) {
                return true;
              }
              if (error.message.includes('5')) {
                return true;
              }
            }
            return false;
          },
        }
      );

      clearTimeout(timeoutId);
      const responseText = await response.text();

      // Check for non-retryable client errors (4xx)
      if (!response.ok && !isRetryableHttpError(response.status)) {
        return {
          success: false,
          error: `Webhook returned ${response.status}: ${responseText}`,
          statusCode: response.status,
          responseBody: responseText,
        };
      }

      if (!response.ok) {
        // This shouldn't happen after retries, but handle gracefully
        return {
          success: false,
          error: `Webhook returned ${response.status} after retries: ${responseText}`,
          statusCode: response.status,
          responseBody: responseText,
        };
      }

      return {
        success: true,
        statusCode: response.status,
        responseBody: responseText,
      };
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
        return { success: false, error: 'Webhook request timed out after retries' };
      }

      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    logger.error('Webhook send error', { component: 'webhooks', error, url: options.url });
    return { success: false, error: error.message };
  }
}

/**
 * Send webhook with retry logic (legacy function - kept for backward compatibility)
 * Note: sendWebhook now includes retry logic internally, but this function
 * provides additional retry attempts on top of that
 */
export async function sendWebhookWithRetry(
  options: WebhookOptions,
  _maxRetries: number = 3,
  _initialDelay: number = 1000
): Promise<WebhookResult> {
  // sendWebhook now has built-in retry logic, so this is mainly for backward compatibility
  // If additional retry attempts are needed, they can be added here
  return await sendWebhook(options);
}

/**
 * Generate standard incident webhook payload
 */
export function generateIncidentWebhookPayload(
  incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string; id: string };
    assignee?: { name: string; email: string; id: string } | null;
    createdAt: Date;
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated'
): Record<string, any> {
  const baseUrl = getBaseUrl();
  const incidentUrl = `${baseUrl}/incidents/${incident.id}`;

  return {
    event: {
      type: eventType,
      timestamp: new Date().toISOString(),
    },
    incident: {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      status: incident.status,
      urgency: incident.urgency,
      url: incidentUrl,
      service: {
        id: incident.service.id,
        name: incident.service.name,
      },
      assignee: incident.assignee
        ? {
            id: incident.assignee.id,
            name: incident.assignee.name,
            email: incident.assignee.email,
          }
        : null,
      timestamps: {
        created: incident.createdAt.toISOString(),
        acknowledged: incident.acknowledgedAt?.toISOString() || null,
        resolved: incident.resolvedAt?.toISOString() || null,
      },
    },
  };
}

/**
 * Format payload for Google Chat
 */
/**
 * Format payload for Google Chat (Premium)
 */
export function formatGoogleChatPayload(
  incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string; id: string };
    assignee?: { name: string; email: string; id: string } | null;
    createdAt: Date;
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated',
  baseUrl: string
): Record<string, any> {
  const incidentUrl = `${baseUrl}/incidents/${incident.id}`;

  // Status mapping
  const statusIcon =
    eventType === 'triggered'
      ? '🔥'
      : eventType === 'acknowledged'
        ? '⚠️'
        : eventType === 'resolved'
          ? '✅'
          : 'ℹ️';

  return {
    cards: [
      {
        header: {
          title: `Incident ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`,
          subtitle: `${incident.service.name} • ${incident.urgency}`,
          imageUrl:
            'https://raw.githubusercontent.com/google/material-design-icons/master/png/alert/error_outline/materialicons/24dp/2x/baseline_error_outline_black_24dp.png', // Generic alert icon
          imageStyle: 'AVATAR',
        },
        sections: [
          {
            header: 'Details',
            widgets: [
              {
                textParagraph: {
                  text: `<b>${statusIcon} ${incident.title}</b>`,
                },
              },
              {
                keyValue: {
                  topLabel: 'Current Status',
                  content: incident.status,
                  icon: 'DESCRIPTION',
                },
              },
              {
                keyValue: {
                  topLabel: 'Assignee',
                  content: incident.assignee?.name || 'Unassigned',
                  icon: 'PERSON',
                },
              },
            ],
          },
          ...(incident.description
            ? [
                {
                  widgets: [
                    {
                      textParagraph: {
                        text: `<b>Description:</b><br>${incident.description.substring(0, 500)}${incident.description.length > 500 ? '...' : ''}`,
                      },
                    },
                  ],
                },
              ]
            : []),
          {
            widgets: [
              {
                buttons: [
                  {
                    textButton: {
                      text: 'VIEW INCIDENT',
                      onClick: {
                        openLink: {
                          url: incidentUrl,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Format payload for Microsoft Teams (Adaptive Card)
 */
/**
 * Format payload for Microsoft Teams (Adaptive Card Premium)
 */
export function formatMicrosoftTeamsPayload(
  incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string; id: string };
    assignee?: { name: string; email: string; id: string } | null;
    createdAt: Date;
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated',
  baseUrl: string
): Record<string, any> {
  const incidentUrl = `${baseUrl}/incidents/${incident.id}`;
  const accentColor =
    eventType === 'triggered'
      ? 'Attention' // Red
      : eventType === 'acknowledged'
        ? 'Warning' // Yellow/Orange
        : eventType === 'resolved'
          ? 'Good' // Green
          : 'Default';

  const statusEmoji =
    eventType === 'triggered'
      ? '🔥'
      : eventType === 'acknowledged'
        ? '⚠️'
        : eventType === 'resolved'
          ? '✅'
          : 'ℹ️';

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'Container',
              style: accentColor,
              items: [
                {
                  type: 'TextBlock',
                  text: `${statusEmoji} Incident ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`,
                  weight: 'Bolder',
                  size: 'Medium',
                  color: 'Light',
                },
              ],
            },
            {
              type: 'TextBlock',
              text: incident.title,
              weight: 'Bolder',
              size: 'ExtraLarge',
              wrap: true,
              spacing: 'Small',
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Service', value: incident.service.name },
                { title: 'Status', value: incident.status },
                { title: 'Urgency', value: incident.urgency },
                { title: 'Assignee', value: incident.assignee?.name || 'Unassigned' },
              ],
              spacing: 'Medium',
            },
            ...(incident.description
              ? [
                  {
                    type: 'Container',
                    separator: true,
                    items: [
                      {
                        type: 'TextBlock',
                        text: 'Description',
                        weight: 'Bolder',
                        size: 'Small',
                      },
                      {
                        type: 'TextBlock',
                        text: incident.description,
                        wrap: true,
                        isSubtle: true,
                      },
                    ],
                  },
                ]
              : []),
            {
              type: 'Container',
              separator: true,
              items: [
                {
                  type: 'TextBlock',
                  text: `Updated: ${new Date().toLocaleString()}`,
                  size: 'Small',
                  isSubtle: true,
                  horizontalAlignment: 'Right',
                },
              ],
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View Incident',
              url: incidentUrl,
              style: 'positive',
            },
          ],
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        },
      },
    ],
  };
}

/**
 * Format payload for Discord (Embed)
 */
/**
 * Format payload for Discord (Embed Premium)
 */
export function formatDiscordPayload(
  incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string; id: string };
    assignee?: { name: string; email: string; id: string } | null;
    createdAt: Date;
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated',
  baseUrl: string
): Record<string, any> {
  const incidentUrl = `${baseUrl}/incidents/${incident.id}`;
  const color =
    eventType === 'triggered'
      ? 0xd32f2f // Red
      : eventType === 'acknowledged'
        ? 0xf9a825 // Yellow
        : eventType === 'resolved'
          ? 0x388e3c // Green
          : 0x757575; // Grey

  const statusEmoji =
    eventType === 'triggered'
      ? '🔴'
      : eventType === 'acknowledged'
        ? '🟡'
        : eventType === 'resolved'
          ? '🟢'
          : 'ℹ️';

  return {
    embeds: [
      {
        title: `${statusEmoji} Incident ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`,
        description: `**${incident.title}**\n\n${incident.description ? incident.description.substring(0, 1000) : '_No description provided_'}`,
        url: incidentUrl,
        color: color,
        fields: [
          {
            name: '🏢 Service',
            value: `\`${incident.service.name}\``,
            inline: true,
          },
          {
            name: '🚦 Urgency',
            value: `\`${incident.urgency}\``,
            inline: true,
          },
          {
            name: '📡 Status',
            value: `\`${incident.status}\``,
            inline: true,
          },
          {
            name: '👤 Assignee',
            value: incident.assignee?.name || '_Unassigned_',
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `OpsKnight • ${incident.id}`,
        },
      },
    ],
  };
}

/**
 * Format payload for Telegram
 */
export function formatTelegramPayload(
  incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string; id: string };
    assignee?: { name: string; email: string; id: string } | null;
    createdAt: Date;
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated',
  baseUrl: string,
  channel?: string
): Record<string, any> {
  const incidentUrl = `${baseUrl}/incidents/${incident.id}`;
  const statusEmoji =
    eventType === 'triggered'
      ? '🔴'
      : eventType === 'acknowledged'
        ? '🟡'
        : eventType === 'resolved'
          ? '🟢'
          : '⚪';

  const text = [
    `${statusEmoji} Incident ${eventType.toUpperCase()}: ${incident.title}`,
    `Service: ${incident.service.name}`,
    `Status: ${incident.status}`,
    `Urgency: ${incident.urgency}`,
    `Assignee: ${incident.assignee?.name || 'Unassigned'}`,
    incident.description ? `Details: ${incident.description}` : null,
    `View: ${incidentUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    chat_id: channel,
    text,
    disable_web_page_preview: false,
  };
}

/**
 * Format payload for Slack (Block Kit)
 */
export function formatSlackPayload(
  incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string; id: string };
    assignee?: { name: string; email: string; id: string } | null;
    createdAt: Date;
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated',
  baseUrl: string
): Record<string, any> {
  const incidentUrl = `${baseUrl}/incidents/${incident.id}`;

  // Status color mapping
  const statusEmoji =
    eventType === 'triggered'
      ? '🔴'
      : eventType === 'acknowledged'
        ? '🟡'
        : eventType === 'resolved'
          ? '🟢'
          : '⚪';

  const headerText = `${statusEmoji} Incident ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}: ${incident.title}`;

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: headerText.substring(0, 150), // Slack header limit
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Service:*\n${incident.service.name}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${incident.status}`,
          },
          {
            type: 'mrkdwn',
            text: `*Urgency:*\n${incident.urgency}`,
          },
          {
            type: 'mrkdwn',
            text: `*Assignee:*\n${incident.assignee?.name || 'Unassigned'}`,
          },
        ],
      },
      ...(incident.description
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Description:*\n${incident.description}`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Incident',
              emoji: true,
            },
            url: incidentUrl,
            style: eventType === 'resolved' ? 'primary' : 'danger',
          },
        ],
      },
    ],
  };
}

/**
 * Format payload based on webhook type
 */
export function formatWebhookPayloadByType(
  webhookType: string,
  incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string; id: string };
    assignee?: { name: string; email: string; id: string } | null;
    createdAt: Date;
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated',
  baseUrl: string,
  channel?: string
): Record<string, any> {
  switch (webhookType.toUpperCase()) {
    case 'GOOGLE_CHAT':
      return formatGoogleChatPayload(incident, eventType, baseUrl);
    case 'TEAMS':
    case 'MICROSOFT_TEAMS':
      return formatMicrosoftTeamsPayload(incident, eventType, baseUrl);
    case 'SLACK':
      return formatSlackPayload(incident, eventType, baseUrl);
    case 'DISCORD':
      return formatDiscordPayload(incident, eventType, baseUrl);
    case 'TELEGRAM':
      return formatTelegramPayload(incident, eventType, baseUrl, channel);
    case 'GENERIC':
    default:
      return generateIncidentWebhookPayload(incident, eventType);
  }
}

/**
 * Send incident notification webhook with type-specific formatting
 */
export async function sendIncidentWebhook(
  webhookUrl: string,
  incidentId: string,
  eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated',
  secret?: string,
  webhookType?: string,
  channel?: string
): Promise<WebhookResult> {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        service: true,
        assignee: true,
      },
    });

    if (!incident) {
      return { success: false, error: 'Incident not found' };
    }

    const baseUrl = getBaseUrl();
    const payload = webhookType
      ? formatWebhookPayloadByType(webhookType, incident, eventType, baseUrl, channel)
      : generateIncidentWebhookPayload(incident, eventType);

    return await sendWebhookWithRetry({
      url: webhookUrl,
      payload,
      secret,
    });
  } catch (error: any) {
    logger.error('Send incident webhook error', {
      component: 'webhooks',
      error,
      incidentId,
      eventType,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Verify webhook signature (for incoming webhooks)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = generateSignature(payload, secret);
    const providedSignature = signature.replace(/^sha256=/, '');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
  } catch (_error) {
    return false;
  }
}
