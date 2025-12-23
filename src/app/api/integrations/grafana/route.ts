import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformGrafanaToEvent, GrafanaAlert } from '@/lib/integrations/grafana';

/**
 * Grafana Webhook Endpoint
 * POST /api/integrations/grafana?integrationId=xxx
 */
export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const integrationId = searchParams.get('integrationId');
        
        if (!integrationId) {
            return NextResponse.json({ error: 'integrationId is required' }, { status: 400 });
        }

        const integration = await prisma.integration.findUnique({
            where: { id: integrationId },
            include: { service: true }
        });

        if (!integration) {
            return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }

        const body = await req.json();
        const event = transformGrafanaToEvent(body as GrafanaAlert);
        const result = await processEvent(event, integration.serviceId, integration.id);

        return NextResponse.json({ status: 'success', result }, { status: 202 });
    } catch (error: any) {
        console.error('Grafana Integration Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}








