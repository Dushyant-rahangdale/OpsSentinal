import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/sidebar-stats/route';
import prisma from '@/lib/prisma';
import { parseResponse } from '../helpers/api-test';

vi.mock('next-auth', () => ({
    getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
    getAuthOptions: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: vi.fn(),
        },
        incident: {
            count: vi.fn(),
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
        vi.mocked(prisma.incident.count).mockResolvedValue(3);

        const res = await GET();
        const { status, data } = await parseResponse(res);

        expect(status).toBe(200);
        expect(data.activeIncidentsCount).toBe(3);
        expect(prisma.incident.count).toHaveBeenCalledWith({
            where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        });
    });

    it('scopes active incidents for standard users', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'user@example.com' } });
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: 'user-1',
            role: 'USER',
            teamMemberships: [{ teamId: 'team-1' }, { teamId: 'team-2' }],
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        vi.mocked(prisma.incident.count).mockResolvedValue(1);

        const res = await GET();
        const { status, data } = await parseResponse(res);

        expect(status).toBe(200);
        expect(data.activeIncidentsCount).toBe(1);
        expect(prisma.incident.count).toHaveBeenCalledWith({
            where: {
                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                OR: [
                    { assigneeId: 'user-1' },
                    { service: { teamId: { in: ['team-1', 'team-2'] } } },
                ],
            },
        });
    });
});
