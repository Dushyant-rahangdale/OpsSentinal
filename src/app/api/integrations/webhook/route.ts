import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformWebhookToEvent, WebhookPayload, WebhookConfig } from '@/lib/integrations/webhook';

/**
 * Generic Webhook Endpoint
 * POST /api/integrations/webhook?integrationId=xxx
 */
export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const integrationId = searchParams.get('integrationId');
        
        if (!integrationId) {
            return NextResponse.json({ error: 'integrationId is required' }, { status: 400 });
        }

        // Verify integration exists and get service
        const integration = await prisma.integration.findUnique({
            where: { id: integrationId },
            include: { service: true }
        });

        if (!integration) {
            return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }

        const body = await req.json();
        
        // Get webhook config from integration metadata (if stored)
        // For now, use default config
        const config: WebhookConfig = {};
        
        // Transform to standard event format
        const event = transformWebhookToEvent(body as WebhookPayload, config);

        // Process the event
        const result = await processEvent(event, integration.serviceId, integration.id);

        return NextResponse.json({ status: 'success', result }, { status: 202 });
    } catch (error: any) {
        console.error('Webhook Integration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}








