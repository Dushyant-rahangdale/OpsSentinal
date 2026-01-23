/**
 * Webhook delivery system for status page events
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Deliver webhook payload to a URL
 */
async function deliverWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<boolean> {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': payload.event,
        'User-Agent': 'OpsKnight-StatusPage/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      await prisma.statusPageWebhook.updateMany({
        where: { url },
        data: { lastTriggeredAt: new Date() },
      });
      return true;
    }

    logger.warn('api.status_page.webhook.delivery_failed', {
      url,
      status: response.status,
      statusText: response.statusText,
    });
    return false;
  } catch (error: any) {
     
    logger.error('api.status_page.webhook.delivery_error', {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get status pages associated with a service
 */
export async function getStatusPagesForService(serviceId: string): Promise<string[]> {
  try {
    const statusPageServices = await prisma.statusPageService.findMany({
      where: {
        serviceId,
        showOnPage: true,
      },
      include: {
        statusPage: {
          select: {
            id: true,
            enabled: true,
          },
        },
      },
    });

    // Return only enabled status pages
    return statusPageServices.filter(sps => sps.statusPage.enabled).map(sps => sps.statusPageId);
  } catch (error: any) {
     
    logger.error('api.status_page.get_status_pages_for_service_error', {
      serviceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Trigger webhooks for a status page event
 */
export async function triggerStatusPageWebhooks(
  statusPageId: string,
  event: string,
  data: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<void> {
  try {
    const allWebhooks = await prisma.statusPageWebhook.findMany({
      where: {
        statusPageId,
        enabled: true,
      },
    });

    // Filter webhooks that subscribe to this event
    const webhooks = allWebhooks.filter(webhook => {
      const events = Array.isArray(webhook.events) ? webhook.events : [];
      return events.includes(event);
    });

    if (webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Deliver to all webhooks in parallel (don't await - fire and forget)
    const deliveries = webhooks.map(webhook =>
      deliverWebhook(webhook.url, webhook.secret, payload).catch(err => {
        logger.error('api.status_page.webhook.delivery_exception', {
          webhookId: webhook.id,
          error: err instanceof Error ? err.message : String(err),
        });
        return false;
      })
    );

    // Wait for all deliveries (but don't block on failures)
    await Promise.allSettled(deliveries);

    logger.info('api.status_page.webhooks.triggered', {
      statusPageId,
      event,
      webhookCount: webhooks.length,
    });
  } catch (error: any) {
     
    logger.error('api.status_page.webhooks.trigger_error', {
      statusPageId,
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger webhooks for all status pages associated with a service
 * This is the main entry point for triggering webhooks from incident events
 */
export async function triggerWebhooksForService(
  serviceId: string,
  event: string,
  incidentData: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<void> {
  try {
    const statusPageIds = await getStatusPagesForService(serviceId);

    // If no status pages are associated, try to trigger for the default enabled status page
    if (statusPageIds.length === 0) {
      const defaultStatusPage = await prisma.statusPage.findFirst({
        where: { enabled: true },
        select: { id: true },
      });

      if (defaultStatusPage) {
        await triggerStatusPageWebhooks(defaultStatusPage.id, event, incidentData);
      }
      return;
    }

    // Trigger webhooks for all associated status pages in parallel
    await Promise.allSettled(
      statusPageIds.map(statusPageId =>
        triggerStatusPageWebhooks(statusPageId, event, incidentData).catch(err => {
          logger.error('api.status_page.webhook.trigger_for_service_error', {
            serviceId,
            statusPageId,
            event,
            error: err instanceof Error ? err.message : String(err),
          });
        })
      )
    );
  } catch (error: any) {
     
    logger.error('api.status_page.webhook.trigger_for_service_fatal_error', {
      serviceId,
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const providedSignature = signature.replace('sha256=', '');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
  } catch {
    return false;
  }
}
