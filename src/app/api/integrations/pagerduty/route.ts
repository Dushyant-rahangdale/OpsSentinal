import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformPagerDutyToEvent, PagerDutyEvent } from '@/lib/integrations/pagerduty';
import { isIntegrationAuthorized } from '@/lib/integrations/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * PagerDuty Webhook Endpoint
 * POST /api/integrations/pagerduty?integrationId=xxx
 */
export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const integrationId = searchParams.get('integrationId');
        
        if (!integrationId) {
            return jsonError('integrationId is required', 400);
        }

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

        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return jsonError('Invalid JSON in request body.', 400);
        }
        const event = transformPagerDutyToEvent(body as PagerDutyEvent);
        const result = await processEvent(event, integration.serviceId, integration.id);

        return jsonOk({ status: 'success', result }, 202);
    } catch (error: any) {
        logger.error('api.integration.pagerduty_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Internal Server Error', 500);
    }
}









