import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '@/lib/events';
import { transformCloudWatchToEvent, CloudWatchAlarmMessage } from '@/lib/integrations/cloudwatch';

/**
 * AWS CloudWatch Webhook Endpoint
 * POST /api/integrations/cloudwatch?integrationId=xxx
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

        // CloudWatch sends SNS messages which contain the alarm message
        const body = await req.json();
        
        // Handle SNS format
        let alarmMessage: CloudWatchAlarmMessage;
        if (body.Type === 'Notification' && body.Message) {
            // SNS notification format
            alarmMessage = JSON.parse(body.Message);
        } else if (body.AlarmName) {
            // Direct CloudWatch format
            alarmMessage = body;
        } else {
            return NextResponse.json({ error: 'Invalid CloudWatch payload format' }, { status: 400 });
        }

        // Transform to standard event format
        const event = transformCloudWatchToEvent(alarmMessage);

        // Process the event
        const result = await processEvent(event, integration.serviceId, integration.id);

        return NextResponse.json({ status: 'success', result }, { status: 202 });
    } catch (error: any) {
        console.error('CloudWatch Integration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}








