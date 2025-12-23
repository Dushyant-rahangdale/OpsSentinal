import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformAzureToEvent, AzureAlertData } from '@/lib/integrations/azure';

/**
 * Azure Monitor Webhook Endpoint
 * POST /api/integrations/azure?integrationId=xxx
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
        const event = transformAzureToEvent(body as AzureAlertData);

        // Process the event
        const result = await processEvent(event, integration.serviceId, integration.id);

        return NextResponse.json({ status: 'success', result }, { status: 202 });
    } catch (error: any) {
        console.error('Azure Integration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}








