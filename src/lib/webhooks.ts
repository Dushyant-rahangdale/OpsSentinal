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
import { retryFetch, isRetryableHttpError } from './retry';

export type WebhookOptions = {
    url: string;
    payload: Record<string, any>;
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
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

/**
 * Send webhook notification
 */
export async function sendWebhook(
    options: WebhookOptions
): Promise<WebhookResult> {
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

        // Stringify payload
        const payloadString = JSON.stringify(payload);

        // Prepare headers
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'OpsGuard/1.0',
            ...headers,
        };

        // Add signature if secret provided
        if (secret) {
            const signature = generateSignature(payloadString, secret);
            requestHeaders['X-OpsGuard-Signature'] = `sha256=${signature}`;
            requestHeaders['X-OpsGuard-Timestamp'] = Date.now().toString();
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
                    retryableErrors: (error) => {
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
                    }
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
        console.error('Webhook send error:', error);
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
    maxRetries: number = 3,
    initialDelay: number = 1000
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
            assignee: incident.assignee ? {
                id: incident.assignee.id,
                name: incident.assignee.name,
                email: incident.assignee.email,
            } : null,
            timestamps: {
                created: incident.createdAt.toISOString(),
                acknowledged: incident.acknowledgedAt?.toISOString() || null,
                resolved: incident.resolvedAt?.toISOString() || null,
            },
        },
    };
}

/**
 * Send incident notification webhook
 */
export async function sendIncidentWebhook(
    webhookUrl: string,
    incidentId: string,
    eventType: 'triggered' | 'acknowledged' | 'resolved' | 'updated',
    secret?: string
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

        const payload = generateIncidentWebhookPayload(incident, eventType);

        return await sendWebhookWithRetry({
            url: webhookUrl,
            payload,
            secret,
        });
    } catch (error: any) {
        console.error('Send incident webhook error:', error);
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
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(providedSignature)
        );
    } catch (error) {
        return false;
    }
}






