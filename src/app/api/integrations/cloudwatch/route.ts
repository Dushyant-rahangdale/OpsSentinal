import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformCloudWatchToEvent, CloudWatchAlarmMessage } from '@/lib/integrations/cloudwatch';
import { isIntegrationAuthorized } from '@/lib/integrations/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * AWS CloudWatch Webhook Endpoint
 * POST /api/integrations/cloudwatch?integrationId=xxx
 */
export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const integrationId = searchParams.get('integrationId');
        
        if (!integrationId) {
            return jsonError('integrationId is required', 400);
        }

        // Verify integration exists and get service
        const integration = await prisma.integration.findUnique({
            where: { id: integrationId },
            include: { service: true }
        });

        if (!integration) {
            return jsonError('Integration not found', 404);
        }

        if (!isIntegrationAuthorized(req, integration.key)) {
            return jsonError('Unauthorized', 401);
        }

        // CloudWatch sends SNS messages which contain the alarm message
        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return jsonError('Invalid JSON in request body.', 400);
        }
        
        // Handle SNS format
        let alarmMessage: CloudWatchAlarmMessage;
        if (body.Type === 'Notification' && body.Message) {
            // SNS notification format
            alarmMessage = JSON.parse(body.Message);
        } else if (body.AlarmName) {
            // Direct CloudWatch format
            alarmMessage = body;
        } else {
            return jsonError('Invalid CloudWatch payload format', 400);
        }

        // Transform to standard event format
        const event = transformCloudWatchToEvent(alarmMessage);

        // Process the event
        const result = await processEvent(event, integration.serviceId, integration.id);

        return jsonOk({ status: 'success', result }, 202);
    } catch (error: any) {
        logger.error('api.integration.cloudwatch_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError('Internal Server Error', 500);
    }
}










