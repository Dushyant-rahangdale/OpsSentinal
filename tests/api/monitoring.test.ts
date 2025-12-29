import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as servicesRoute from '@/app/api/monitoring/services/route';
import * as queriesRoute from '@/app/api/monitoring/queries/route';
import prisma from '@/lib/prisma';
import { createMockRequest, parseResponse } from '../helpers/api-test';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthOptions: vi.fn().mockResolvedValue({}),
}));

describe('Monitoring API Routes', () => {
  const adminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
    name: 'Admin User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/monitoring/services returns 403 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await servicesRoute.GET();
    const { status } = await parseResponse(res);

    expect(status).toBe(403);
  });

  it('GET /api/monitoring/services returns 200 for admin session', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: adminUser.email } });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any);

    const res = await servicesRoute.GET();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('GET /api/monitoring/queries returns 403 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = await createMockRequest('GET', '/api/monitoring/queries');
    const res = await queriesRoute.GET(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(403);
  });

  it('GET /api/monitoring/queries returns 200 for admin session', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: adminUser.email } });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any);

    const req = await createMockRequest('GET', '/api/monitoring/queries?limit=5');
    const res = await queriesRoute.GET(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });
});
