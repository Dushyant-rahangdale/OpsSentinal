/**
 * Slack Channels API
 * Lists available Slack channels for UI dropdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { retryFetch } from '@/lib/retry';

type SlackApiChannel = {
  id: string;
  name: string;
  is_channel?: boolean;
  is_archived?: boolean;
  is_private?: boolean;
  is_member?: boolean;
};

const SLACK_CHANNEL_TYPES = 'public_channel,private_channel';

async function resolveSlackBotToken(serviceId: string | null): Promise<string | null> {
  // Prefer global integration for centralized configuration
  const globalIntegration = await prisma.slackIntegration.findFirst({
    where: {
      enabled: true,
      service: null,
    },
  });

  if (globalIntegration?.botToken) {
    try {
      const { decrypt } = await import('@/lib/encryption');
      return await decrypt(globalIntegration.botToken);
    } catch (error) {
      logger.error('[Slack] Failed to decrypt global token', { error });
    }
  }

  // Backward-compatible: service-specific integration fallback
  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { slackIntegration: true },
    });

    if (service?.slackIntegration?.enabled && service.slackIntegration.botToken) {
      try {
        const { decrypt } = await import('@/lib/encryption');
        return await decrypt(service.slackIntegration.botToken);
      } catch (error) {
        logger.error('[Slack] Failed to decrypt token', { serviceId, error });
      }
    }
  }

  return process.env.SLACK_BOT_TOKEN || null;
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    const botToken = await resolveSlackBotToken(serviceId);

    if (!botToken) {
      return NextResponse.json(
        { error: 'Slack bot token not configured. Please connect Slack workspace first.' },
        { status: 503 }
      );
    }

    // Fetch channels from Slack API
    const listUrl = new URL('https://slack.com/api/conversations.list');
    listUrl.searchParams.set('exclude_archived', 'true');
    listUrl.searchParams.set('limit', '200');
    listUrl.searchParams.set('types', SLACK_CHANNEL_TYPES);

    const response = await retryFetch(
      listUrl.toString(),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        maxAttempts: 2,
        initialDelayMs: 500,
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

    // Filter channels:
    // - Must be a channel (not a DM or group DM)
    // - Not archived
    const channels = (data.channels || [])
      .filter((channel: SlackApiChannel) => channel.is_channel && !channel.is_archived)
      .map((channel: SlackApiChannel) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: Boolean(channel.is_private),
        isMember: Boolean(channel.is_member),
      }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json({ channels });
  } catch (error: any) {
    logger.error('[Slack] Channels API error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const channelId = typeof body?.channelId === 'string' ? body.channelId : null;
    const serviceId = typeof body?.serviceId === 'string' ? body.serviceId : null;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const botToken = await resolveSlackBotToken(serviceId);
    if (!botToken) {
      return NextResponse.json(
        { error: 'Slack bot token not configured. Please connect Slack workspace first.' },
        { status: 503 }
      );
    }

    const response = await retryFetch(
      'https://slack.com/api/conversations.join',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: channelId }),
      },
      {
        maxAttempts: 2,
        initialDelayMs: 500,
      }
    );

    const data = await response.json();

    if (!data.ok) {
      logger.warn('[Slack] Failed to join channel', { error: data.error, channelId });
      return NextResponse.json({ error: data.error || 'Failed to join channel' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error('[Slack] Join channel error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
