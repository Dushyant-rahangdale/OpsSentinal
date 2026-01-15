import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformWebhookToEvent, WebhookPayload, WebhookConfig } from '@/lib/integrations/webhook';
import { isIntegrationAuthorized } from '@/lib/integrations/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { withIntegrationMiddleware } from '@/lib/integrations/handler';
import { validatePayload, GenericWebhookSchema } from '@/lib/integrations/schemas';
import { verifyHmacSignature } from '@/lib/integrations/signature-verification';

const VERIFY_SIGNATURES = process.env.INTEGRATION_VERIFY_SIGNATURES !== 'false';

/**
 * Generic Webhook Endpoint
 * POST /api/integrations/webhook?integrationId=xxx
 *
 * Features:
 * - Rate limiting (100 req/min per integration)
 * - Optional HMAC signature verification (X-Signature or X-Webhook-Signature)
 * - Flexible payload validation
 * - Metrics tracking (success rate, latency)
 */
export async function POST(req: NextRequest) {
  return withIntegrationMiddleware(req, 'WEBHOOK', async () => {
    const startTime = Date.now();

    try {
      const { searchParams } = new URL(req.url);
      const integrationId = searchParams.get('integrationId');

      if (!integrationId) {
        return jsonError('integrationId is required', 400);
      }

      // Get raw body for signature verification
      const rawBody = await req.text();

      // Verify integration exists and get service
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        include: { service: true },
      });

      if (!integration) {
        return jsonError('Integration not found', 404);
      }

      if (!integration.enabled) {
        return jsonError('Integration is disabled', 403);
      }

      if (!isIntegrationAuthorized(req, integration.key)) {
        return jsonError('Unauthorized', 401);
      }

      // Verify signature if secret is configured
      if (VERIFY_SIGNATURES && integration.signatureSecret) {
        const signature = req.headers.get('x-signature') || req.headers.get('x-webhook-signature');
        if (signature) {
          if (!verifyHmacSignature(rawBody, signature, integration.signatureSecret)) {
            logger.warn('api.integration.webhook_invalid_signature', { integrationId });
            return jsonError('Invalid webhook signature', 401);
          }
        }
      }

      let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        body = JSON.parse(rawBody);
      } catch (_error) {
        return jsonError('Invalid JSON in request body.', 400);
      }

      // Validate payload (flexible - allows additional fields)
      const validation = validatePayload(GenericWebhookSchema, body);
      if (!validation.success) {
        logger.warn('api.integration.webhook_validation_failed', {
          errors: validation.errors,
          integrationId,
        });
      }

      // Get webhook config from integration metadata (if stored)
      // For now, use default config
      const config: WebhookConfig = {};

      // Transform to standard event format
      const event = transformWebhookToEvent(body as WebhookPayload, config);

      // Process the event
      const result = await processEvent(event, integration.serviceId, integration.id);

      logger.info('api.integration.webhook_success', {
        integrationId,
        action: result.action,
        latencyMs: Date.now() - startTime,
      });

      return jsonOk({ status: 'success', result }, 202);
    } catch (error: any) {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      logger.error('api.integration.webhook_error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return jsonError('Internal Server Error', 500);
    }
  });
}
