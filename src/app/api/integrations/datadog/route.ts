import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformDatadogToEvent, DatadogEvent } from '@/lib/integrations/datadog';

/**
 * Datadog Webhook Endpoint
 * POST /api/integrations/datadog?integrationId=xxx
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
        
        // Transform to standard event format
        const event = transformDatadogToEvent(body as DatadogEvent);

        // Process the event
        const result = await processEvent(event, integration.serviceId, integration.id);

        return NextResponse.json({ status: 'success', result }, { status: 202 });
    } catch (error: any) {
        console.error('Datadog Integration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}








