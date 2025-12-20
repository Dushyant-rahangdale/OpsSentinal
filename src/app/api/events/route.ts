import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent, EventPayload } from '@/lib/events';
import { authenticateApiKey, hasApiScopes } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
    try {
        // 1. Validate Integration Key or API Key
        const authHeader = req.headers.get('Authorization');
        let integrationId: string | null = null;
        let serviceId: string | null = null;
        let apiKeyScopes: string[] | null = null;

        if (authHeader?.startsWith('Token token=')) {
            const key = authHeader.split('Token token=')[1];
            const integration = await prisma.integration.findUnique({ where: { key } });
            if (!integration) {
                return NextResponse.json({ error: 'Invalid Integration Key' }, { status: 403 });
            }
            integrationId = integration.id;
            serviceId = integration.serviceId;
        } else {
            const apiKey = await authenticateApiKey(req);
            if (!apiKey) {
                return NextResponse.json({ error: 'Unauthorized. Missing or invalid API key.' }, { status: 401 });
            }
            apiKeyScopes = apiKey.scopes;
        }

        // 2. Parse Body
        const body = await req.json();

        // Validate payload structure (Basic check)
        if (!body.event_action || !body.dedup_key || !body.payload) {
            return NextResponse.json({ error: 'Invalid Payload. Required: event_action, dedup_key, payload' }, { status: 400 });
        }

        if (!serviceId) {
            if (!hasApiScopes(apiKeyScopes, ['events:write'])) {
                return NextResponse.json({ error: 'API key missing scope: events:write.' }, { status: 403 });
            }
            const candidate = body.service_id || body.serviceId;
            if (!candidate || typeof candidate !== 'string') {
                return NextResponse.json({ error: 'service_id is required when using API keys.' }, { status: 400 });
            }
            const service = await prisma.service.findUnique({ where: { id: candidate } });
            if (!service) {
                return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
            }
            serviceId = service.id;
            integrationId = 'api-key';
        }

        // 3. Process Event
        const result = await processEvent(body as EventPayload, serviceId, integrationId || 'api-key');

        return NextResponse.json({ status: 'success', result }, { status: 202 });

    } catch (error: any) {
        console.error('Event Ingestion Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
