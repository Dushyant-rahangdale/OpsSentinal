/**
 * Slack Interactive Actions API
 * Handles Slack button clicks for ack/resolve actions
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

/**
 * Verify Slack request signature
 */
function verifySlackSignature(
    body: string,
    signature: string,
    timestamp: string
): boolean {
    if (!SLACK_SIGNING_SECRET) {
        logger.warn('[Slack] No signing secret configured, skipping verification');
        return true; // Allow in development if no secret configured
    }

    // Check timestamp (prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - requestTime) > 300) {
        // Request is older than 5 minutes
        return false;
    }

    // Create signature
    const sigBaseString = `v0:${timestamp}:${body}`;
    const computedSignature = 'v0=' + crypto
        .createHmac('sha256', SLACK_SIGNING_SECRET)
        .update(sigBaseString)
        .digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
        Buffer.from(computedSignature),
        Buffer.from(signature)
    );
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-slack-signature') || '';
        const timestamp = request.headers.get('x-slack-request-timestamp') || '';

        // Verify signature
        if (!verifySlackSignature(body, signature, timestamp)) {
            logger.warn('[Slack] Invalid signature', { signature, timestamp });
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        const payload = JSON.parse(body);

        // Handle URL verification (for Slack app setup)
        if (payload.type === 'url_verification') {
            return NextResponse.json({ challenge: payload.challenge });
        }

        // Handle interactive button clicks
        if (payload.type === 'block_actions') {
            const action = payload.actions?.[0];
            if (!action) {
                return NextResponse.json({ error: 'No action found' }, { status: 400 });
            }

            const actionValue = JSON.parse(action.value || '{}');
            const { action: actionType, incidentId } = actionValue;

            if (!incidentId || !actionType) {
                return NextResponse.json(
                    { error: 'Invalid action data' },
                    { status: 400 }
                );
            }

            // Get incident
            const incident = await prisma.incident.findUnique({
                where: { id: incidentId }
            });

            if (!incident) {
                return NextResponse.json(
                    { error: 'Incident not found' },
                    { status: 404 }
                );
            }

            // Update incident based on action
            let updateData: any = {};
            let responseMessage = '';

            if (actionType === 'ack') {
                if (incident.status === 'OPEN') {
                    updateData = {
                        status: 'ACKNOWLEDGED',
                        acknowledgedAt: new Date()
                    };
                    responseMessage = 'Incident acknowledged';
                } else {
                    return NextResponse.json({
                        text: 'Incident is already acknowledged or resolved'
                    });
                }
            } else if (actionType === 'resolve') {
                if (incident.status !== 'RESOLVED') {
                    updateData = {
                        status: 'RESOLVED',
                        resolvedAt: new Date()
                    };
                    responseMessage = 'Incident resolved';
                } else {
                    return NextResponse.json({
                        text: 'Incident is already resolved'
                    });
                }
            } else {
                return NextResponse.json(
                    { error: 'Unknown action' },
                    { status: 400 }
                );
            }

            // Update incident
            await prisma.incident.update({
                where: { id: incidentId },
                data: updateData
            });

            // Create incident event
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: `${responseMessage} via Slack`
                }
            });

            // Send confirmation back to Slack
            return NextResponse.json({
                text: responseMessage,
                replace_original: false
            });
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        logger.error('[Slack] Actions API error', {
            error: error.message,
            stack: error.stack
        });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}



