import { describe, it, expect, vi, beforeEach } from 'vitest';
import { slaService } from '@/services/sla/SLAService';
import prisma from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    default: {
        sLADefinition: { findUnique: vi.fn(), create: vi.fn() },
        metricRollup: { findMany: vi.fn() },
        sLASnapshot: { upsert: vi.fn() }
    }
}));

// Mock Logger
vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn()
    }
}));

describe('SLAService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockedPrisma = prisma as unknown as {
        sLADefinition: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
        metricRollup: { findMany: ReturnType<typeof vi.fn> };
        sLASnapshot: { upsert: ReturnType<typeof vi.fn> };
    };
    const mockSlaId = 'sla-123';
    const mockServiceId = 'svc-abc';
    const mockDate = new Date('2025-01-01T12:00:00Z');
    type SnapshotUpsertArgs = Parameters<typeof prisma.sLASnapshot.upsert>[0];

    it('should calculate 100% uptime when no errors exist', async () => {
        // Arrange
        mockedPrisma.sLADefinition.findUnique.mockResolvedValue({
            id: mockSlaId,
            serviceId: mockServiceId,
            metricType: 'UPTIME',
            target: 99.9
        });

        mockedPrisma.metricRollup.findMany.mockResolvedValue([
            { count: 100, tags: { status: '200' } },
            { count: 50, tags: { status: '302' } }
        ]);

        mockedPrisma.sLASnapshot.upsert.mockImplementation((args: SnapshotUpsertArgs) => Promise.resolve(args.create));

        // Act
        await slaService.generateDailySnapshot(mockSlaId, mockDate);

        // Assert
        const upsertCall = mockedPrisma.sLASnapshot.upsert.mock.calls[0][0] as SnapshotUpsertArgs;
        expect(upsertCall.create.uptimePercentage).toBe(100);
        expect(upsertCall.create.breachCount).toBe(0);
        expect(upsertCall.create.totalEvents).toBe(150);
        expect(upsertCall.create.errorEvents).toBe(0);
    });

    it('should calculate downtime percentage correctly', async () => {
        // Arrange
        mockedPrisma.sLADefinition.findUnique.mockResolvedValue({
            id: mockSlaId,
            serviceId: mockServiceId,
            metricType: 'UPTIME',
            target: 99.0
        });

        // 900 Success, 100 Errors = 90% Uptime
        mockedPrisma.metricRollup.findMany.mockResolvedValue([
            { count: 900, tags: { status: '200' } },
            { count: 100, tags: { status: '500' } }
        ]);

        // Act
        await slaService.generateDailySnapshot(mockSlaId, mockDate);

        // Assert
        const upsertCall = mockedPrisma.sLASnapshot.upsert.mock.calls[0][0] as SnapshotUpsertArgs;
        expect(upsertCall.create.uptimePercentage).toBe(90.0);
        expect(upsertCall.create.errorEvents).toBe(100);
        expect(upsertCall.create.totalEvents).toBe(1000);
    });

    it('should mark a breach when uptime is below target', async () => {
        // Arrange
        mockedPrisma.sLADefinition.findUnique.mockResolvedValue({
            id: mockSlaId,
            serviceId: mockServiceId,
            metricType: 'UPTIME',
            target: 99.99 // Very high target
        });

        // 99.0% Uptime
        mockedPrisma.metricRollup.findMany.mockResolvedValue([
            { count: 99, tags: { status: '200' } },
            { count: 1, tags: { status: '500' } }
        ]);

        // Act
        await slaService.generateDailySnapshot(mockSlaId, mockDate);

        // Assert
        const upsertCall = mockedPrisma.sLASnapshot.upsert.mock.calls[0][0] as SnapshotUpsertArgs;
        expect(upsertCall.create.uptimePercentage).toBe(99.0);
        expect(upsertCall.create.breachCount).toBe(1); // Breach detected
    });

    it('should handle zero traffic as 100% uptime (optimistic)', async () => {
        mockedPrisma.sLADefinition.findUnique.mockResolvedValue({
            id: mockSlaId,
            metricType: 'UPTIME',
            target: 99.9
        });
        mockedPrisma.metricRollup.findMany.mockResolvedValue([]);

        await slaService.generateDailySnapshot(mockSlaId, mockDate);

        const upsertCall = mockedPrisma.sLASnapshot.upsert.mock.calls[0][0] as SnapshotUpsertArgs;
        expect(upsertCall.create.uptimePercentage).toBe(100);
    });
});
