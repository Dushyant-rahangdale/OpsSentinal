/**
 * Slack Channels API
 * Lists available Slack channels for UI dropdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { retryFetch } from '@/lib/retry';

export async function GET(request: NextRequest) {
    try {
        // Require authentication
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const serviceId = searchParams.get('serviceId');

        // Get bot token (from OAuth integration or env fallback)
        let botToken: string | null = null;

        if (serviceId) {
            const service = await prisma.service.findUnique({
                where: { id: serviceId },
                include: { slackIntegration: true }
            });

            if (service?.slackIntegration?.enabled && service.slackIntegration.botToken) {
                try {
                    const { decrypt } = await import('@/lib/encryption');
                    botToken = decrypt(service.slackIntegration.botToken);
                } catch (error) {
                    logger.error('[Slack] Failed to decrypt token', { serviceId, error });
                }
            }
        }

        // Try global integration (one not linked to any service)
        if (!botToken) {
            const globalIntegration = await prisma.slackIntegration.findFirst({
                where: { 
                    enabled: true,
                    service: null // Not linked to any service
                }
            });

            if (globalIntegration?.botToken) {
                try {
                    const { decrypt } = await import('@/lib/encryption');
                    botToken = decrypt(globalIntegration.botToken);
                } catch (error) {
                    logger.error('[Slack] Failed to decrypt global token', { error });
                }
            }
        }

        // Fallback to environment variable
        if (!botToken) {
            botToken = process.env.SLACK_BOT_TOKEN || null;
        }

        if (!botToken) {
            return NextResponse.json(
                { error: 'Slack bot token not configured. Please connect Slack workspace first.' },
                { status: 503 }
            );
        }

        // Fetch channels from Slack API
        const response = await retryFetch(
            'https://slack.com/api/conversations.list',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${botToken}`,
                    'Content-Type': 'application/json'
                }
            },
            {
                maxAttempts: 2,
                initialDelayMs: 500
            }
        );

        const data = await response.json();

        if (!data.ok) {
            logger.error('[Slack] Failed to fetch channels', { error: data.error });
            return NextResponse.json(
                { error: data.error || 'Failed to fetch channels' },
                { status: 500 }
            );
        }

        // Filter to only public channels and private channels the bot is in
        const channels = (data.channels || [])
            .filter((channel: any) => 
                channel.is_channel && !channel.is_archived && !channel.is_private
            )
            .map((channel: any) => ({
                id: channel.id,
                name: channel.name,
                isPrivate: channel.is_private
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        return NextResponse.json({ channels });
    } catch (error: any) {
        logger.error('[Slack] Channels API error', {
            error: error.message,
            stack: error.stack
        });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

