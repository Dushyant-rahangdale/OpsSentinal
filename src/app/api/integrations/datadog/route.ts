import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformDatadogToEvent, DatadogEvent } from '@/lib/integrations/datadog';
import { isIntegrationAuthorized } from '@/lib/integrations/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { withIntegrationMiddleware } from '@/lib/integrations/handler';
import { validatePayload, DatadogEventSchema } from '@/lib/integrations/schemas';

/**
 * Datadog Webhook Endpoint
 * POST /api/integrations/datadog?integrationId=xxx
 *
 * Features:
 * - Rate limiting (100 req/min per integration)
 * - Payload validation via Zod schemas
 * - Metrics tracking (success rate, latency)
 */
export async function POST(req: NextRequest) {
  return withIntegrationMiddleware(req, 'DATADOG', async () => {
    const startTime = Date.now();

    try {
      const { searchParams } = new URL(req.url);
      const integrationId = searchParams.get('integrationId');

      if (!integrationId) {
        return jsonError('integrationId is required', 400);
      }

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

      let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        body = await req.json();
      } catch (_error) {
        return jsonError('Invalid JSON in request body.', 400);
      }

      // Validate payload
      const validation = validatePayload(DatadogEventSchema, body);
      if (!validation.success) {
        logger.warn('api.integration.datadog_validation_failed', {
          errors: validation.errors,
          integrationId,
        });
      }

      // Transform to standard event format
      const event = transformDatadogToEvent(body as DatadogEvent);

      // Process the event
      const result = await processEvent(event, integration.serviceId, integration.id);

      logger.info('api.integration.datadog_success', {
        integrationId,
        action: result.action,
        latencyMs: Date.now() - startTime,
      });

      return jsonOk({ status: 'success', result }, 202);
    } catch (error: any) {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      logger.error('api.integration.datadog_error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return jsonError('Internal Server Error', 500);
    }
  });
}
