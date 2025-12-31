import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkAcknowledge, bulkResolve, bulkUpdateUrgency, bulkUpdateStatus } from '@/app/(app)/incidents/bulk-actions';
import prisma from '@/lib/prisma';
import { getCurrentUser, assertResponderOrAbove } from '@/lib/rbac';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: {
        incident: {
            updateMany: vi.fn(),
            findUnique: vi.fn(),
        },
        incidentEvent: {
            create: vi.fn(),
        },
    },
}));

vi.mock('@/lib/rbac', () => ({
    getCurrentUser: vi.fn(),
    assertResponderOrAbove: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Bulk Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(assertResponderOrAbove).mockResolvedValue({} as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        vi.mocked(getCurrentUser).mockResolvedValue({
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'RESPONDER',
        } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    describe('bulkAcknowledge', () => {
        it('should acknowledge multiple incidents', async () => {
            const incidentIds = ['incident-1', 'incident-2'];
            vi.mocked(prisma.incident.updateMany).mockResolvedValue({ count: 2 });
            vi.mocked(prisma.incidentEvent.create).mockResolvedValue({} as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await bulkAcknowledge(incidentIds);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
            expect(prisma.incident.updateMany).toHaveBeenCalledWith({
                where: {
                    id: { in: incidentIds },
                    status: { not: 'RESOLVED' },
                },
                data: {
                    status: 'ACKNOWLEDGED',
                    acknowledgedAt: expect.any(Date),
                },
            });
        });

        it('should return error if no incidents selected', async () => {
            const result = await bulkAcknowledge([]);

            expect(result.success).toBe(false);
            expect(result.error).toBe('No incidents selected');
        });

        it('should return error if unauthorized', async () => {
            vi.mocked(assertResponderOrAbove).mockRejectedValue(new Error('Unauthorized'));

            const result = await bulkAcknowledge(['incident-1']);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('bulkResolve', () => {
        it('should resolve multiple incidents', async () => {
            const incidentIds = ['incident-1', 'incident-2'];
            vi.mocked(prisma.incident.updateMany).mockResolvedValue({ count: 2 });
            vi.mocked(prisma.incidentEvent.create).mockResolvedValue({} as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await bulkResolve(incidentIds);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
            expect(prisma.incident.updateMany).toHaveBeenCalledWith({
                where: {
                    id: { in: incidentIds },
                },
                data: {
                    status: 'RESOLVED',
                    escalationStatus: 'COMPLETED',
                    nextEscalationAt: null,
                    resolvedAt: expect.any(Date),
                },
            });
        });
    });

    describe('bulkUpdateUrgency', () => {
        it('should update urgency for multiple incidents', async () => {
            const incidentIds = ['incident-1', 'incident-2'];
            vi.mocked(prisma.incident.updateMany).mockResolvedValue({ count: 2 });
            vi.mocked(prisma.incidentEvent.create).mockResolvedValue({} as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await bulkUpdateUrgency(incidentIds, 'HIGH');

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
            expect(prisma.incident.updateMany).toHaveBeenCalledWith({
                where: {
                    id: { in: incidentIds },
                },
                data: { urgency: 'HIGH' },
            });
        });
    });

    describe('bulkUpdateStatus', () => {
        it('should update status to ACKNOWLEDGED with timestamp', async () => {
            const incidentIds = ['incident-1'];
            vi.mocked(prisma.incident.updateMany).mockResolvedValue({ count: 1 });
            vi.mocked(prisma.incidentEvent.create).mockResolvedValue({} as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await bulkUpdateStatus(incidentIds, 'ACKNOWLEDGED');

            expect(result.success).toBe(true);
            expect(prisma.incident.updateMany).toHaveBeenCalledWith({
                where: { id: { in: incidentIds } },
                data: {
                    status: 'ACKNOWLEDGED',
                    acknowledgedAt: expect.any(Date),
                },
            });
        });

        it('should update status to RESOLVED with proper data', async () => {
            const incidentIds = ['incident-1'];
            vi.mocked(prisma.incident.updateMany).mockResolvedValue({ count: 1 });
            vi.mocked(prisma.incidentEvent.create).mockResolvedValue({} as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await bulkUpdateStatus(incidentIds, 'RESOLVED');

            expect(result.success).toBe(true);
            expect(prisma.incident.updateMany).toHaveBeenCalledWith({
                where: { id: { in: incidentIds } },
                data: {
                    status: 'RESOLVED',
                    resolvedAt: expect.any(Date),
                    escalationStatus: 'COMPLETED',
                    nextEscalationAt: null,
                },
            });
        });
    });
});

