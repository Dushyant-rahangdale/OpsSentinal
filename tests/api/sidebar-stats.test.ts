import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/sidebar-stats/route';
import prisma from '@/lib/prisma';
import { calculateSLAMetrics } from '@/lib/sla-server';
import { parseResponse } from '../helpers/api-test';
import type { SLAMetrics } from '@/lib/sla';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthOptions: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/sla-server', () => ({
  calculateSLAMetrics: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('API Route - Sidebar Stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET();
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });

  it('counts active incidents for admin without access filter', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'admin@example.com' } });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'admin-1',
      role: 'ADMIN',
      teamMemberships: [],
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.mocked(calculateSLAMetrics).mockResolvedValue({
      activeCount: 3,
    } as SLAMetrics);

    const res = await GET();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.activeIncidentsCount).toBe(3);
    expect(calculateSLAMetrics).toHaveBeenCalledWith({ useOrScope: true });
  });

  it('scopes active incidents for standard users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'user@example.com' } });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      role: 'USER',
      teamMemberships: [{ teamId: 'team-1' }, { teamId: 'team-2' }],
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.mocked(calculateSLAMetrics).mockResolvedValue({
      activeCount: 1,
    } as SLAMetrics);

    const res = await GET();
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.activeIncidentsCount).toBe(1);
    expect(calculateSLAMetrics).toHaveBeenCalledWith({
      useOrScope: true,
      teamId: ['team-1', 'team-2'],
      assigneeId: 'user-1',
    });
  });
});
