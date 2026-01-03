import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/slack/channels/route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/rbac';
import { retryFetch } from '@/lib/retry';

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    slackIntegration: {
      findFirst: vi.fn(),
    },
    service: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/rbac', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/encryption', () => ({
  decrypt: vi.fn((val: string) => Promise.resolve(val.replace('encrypted_', ''))),
}));

vi.mock('@/lib/retry', () => ({
  retryFetch: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const initialSlackToken = process.env.SLACK_BOT_TOKEN;

describe('Slack Channels API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      role: 'ADMIN',
      timeZone: 'UTC',
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.mocked(prisma.slackIntegration.findFirst).mockResolvedValue({
      id: 'integration-1',
      workspaceId: 'T123',
      workspaceName: 'OpsSentinal HQ',
      botToken: 'encrypted_token',
      signingSecret: null,
      installedBy: 'user-1',
      scopes: ['chat:write'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    if (initialSlackToken) {
      process.env.SLACK_BOT_TOKEN = initialSlackToken;
    } else {
      delete process.env.SLACK_BOT_TOKEN;
    }
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(
      null as unknown as Awaited<ReturnType<typeof getCurrentUser>>
    );

    const req = new NextRequest('http://localhost:3000/api/slack/channels');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('returns 503 when bot token is missing', async () => {
    vi.mocked(prisma.slackIntegration.findFirst).mockResolvedValue(null);
    delete process.env.SLACK_BOT_TOKEN;

    const req = new NextRequest('http://localhost:3000/api/slack/channels');
    const response = await GET(req);

    expect(response.status).toBe(503);
  });

  it('lists channels and preserves membership status', async () => {
    vi.mocked(retryFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        channels: [
          { id: 'C1', name: 'alerts', is_channel: true, is_archived: false, is_member: false },
          { id: 'C2', name: 'incidents', is_channel: true, is_archived: false, is_member: true },
          { id: 'C3', name: 'archived', is_channel: true, is_archived: true, is_member: true },
        ],
      }),
    } as unknown as Response);

    const req = new NextRequest('http://localhost:3000/api/slack/channels');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.channels).toHaveLength(2);
    expect(body.channels.find((ch: { id: string }) => ch.id === 'C1')?.isMember).toBe(false);
    expect(body.channels.find((ch: { id: string }) => ch.id === 'C2')?.isMember).toBe(true);
  });

  it('joins a public channel when requested', async () => {
    vi.mocked(retryFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as unknown as Response);

    const req = new NextRequest('http://localhost:3000/api/slack/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: 'C123' }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('returns an error when Slack join fails', async () => {
    vi.mocked(retryFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: 'missing_scope' }),
    } as unknown as Response);

    const req = new NextRequest('http://localhost:3000/api/slack/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: 'C123' }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('missing_scope');
  });
});
