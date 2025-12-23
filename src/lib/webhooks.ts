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

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body: payloadString,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const responseText = await response.text();

            if (!response.ok) {
                return {
                    success: false,
                    error: `Webhook returned ${response.status}: ${responseText}`,
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
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                return { success: false, error: 'Webhook request timed out' };
            }
            
            throw fetchError;
        }
    } catch (error: any) {
        console.error('Webhook send error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send webhook with retry logic
 */
export async function sendWebhookWithRetry(
    options: WebhookOptions,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<WebhookResult> {
    let lastError: WebhookResult | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = initialDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await sendWebhook(options);
        
        if (result.success) {
            return result;
        }

        lastError = result;

        // Don't retry on client errors (4xx) except 408, 429
        if (result.statusCode && result.statusCode >= 400 && result.statusCode < 500) {
            if (result.statusCode !== 408 && result.statusCode !== 429) {
                break; // Don't retry client errors
            }
        }
    }

    return lastError || { success: false, error: 'Max retries exceeded' };
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





