import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformCloudWatchToEvent, CloudWatchAlarmMessage } from '@/lib/integrations/cloudwatch';
import { isIntegrationAuthorized } from '@/lib/integrations/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { withIntegrationMiddleware } from '@/lib/integrations/handler';
import {
  validatePayload,
  CloudWatchAlarmSchema,
  SNSNotificationSchema,
} from '@/lib/integrations/schemas';

/**
 * AWS CloudWatch Webhook Endpoint
 * POST /api/integrations/cloudwatch?integrationId=xxx
 *
 * Features:
 * - Rate limiting (100 req/min per integration)
 * - Payload validation via Zod schemas
 * - Metrics tracking (success rate, latency)
 */
export async function POST(req: NextRequest) {
  return withIntegrationMiddleware(req, 'CLOUDWATCH', async () => {
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

      // Parse request body
      let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        body = await req.json();
      } catch (_error) {
        return jsonError('Invalid JSON in request body.', 400);
      }

      // Handle SNS format vs direct CloudWatch format
      let alarmMessage: CloudWatchAlarmMessage;

      if (body.Type === 'Notification' && body.Message) {
        // Validate SNS wrapper
        const snsValidation = validatePayload(SNSNotificationSchema, body);
        if (!snsValidation.success) {
          logger.warn('api.integration.cloudwatch_sns_validation_failed', {
            errors: snsValidation.errors,
            integrationId,
          });
        }

        // Parse embedded CloudWatch message
        try {
          alarmMessage = JSON.parse(body.Message);
        } catch {
          return jsonError('Invalid CloudWatch message in SNS payload', 400);
        }
      } else if (body.AlarmName) {
        // Direct CloudWatch format - validate
        const validation = validatePayload(CloudWatchAlarmSchema, body);
        if (!validation.success) {
          logger.warn('api.integration.cloudwatch_validation_failed', {
            errors: validation.errors,
            integrationId,
          });
          return jsonError('Invalid CloudWatch payload format', 400);
        }
        alarmMessage = validation.data;
      } else {
        return jsonError('Invalid CloudWatch payload format', 400);
      }

      // Transform to standard event format
      const event = transformCloudWatchToEvent(alarmMessage);

      // Process the event
      const result = await processEvent(event, integration.serviceId, integration.id);

      logger.info('api.integration.cloudwatch_success', {
        integrationId,
        action: result.action,
        latencyMs: Date.now() - startTime,
      });

      return jsonOk({ status: 'success', result }, 202);
    } catch (error: any) {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      logger.error('api.integration.cloudwatch_error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return jsonError('Internal Server Error', 500);
    }
  });
}
