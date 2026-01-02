import { describe, it, expect, vi, beforeEach } from 'vitest';
import { telemetryV2 } from '@/services/telemetry/TelemetryServiceV2';
import prisma from '@/lib/prisma';

// Mock Prisma
// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    default: {
        metricRollup: { createMany: vi.fn() },
        logEntry: { createMany: vi.fn() }
    }
}));

// Mock Logger
vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn()
    }
}));

describe('TelemetryServiceV2', () => {
    const telemetryState = telemetryV2 as unknown as {
        metricBuffer: Map<string, unknown>;
        logBuffer: unknown[];
        isFlushing: boolean;
        flushMetrics: () => Promise<void>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset private state if possible, or we rely on creating new instances if we exported the class. 
        // Since we exported a singleton, we might need to rely on clearing mocks and state management.
        // For strictly testing unit logic, we can inspect calls.

        // Clearing internal buffer via "any" cast to access private members for testing
        telemetryState.metricBuffer.clear();
        telemetryState.logBuffer = [];
        telemetryState.isFlushing = false;
    });

    it('should aggregate metrics with same tags', () => {
        const tags = { service: 'api', method: 'GET' };

        telemetryV2.recordMetric('http.request.time', 100, tags);
        telemetryV2.recordMetric('http.request.time', 200, tags);

        // Check buffer size
        expect(telemetryState.metricBuffer.size).toBe(1); // Should be 1 entry

        // Trigger flush
        return telemetryState.flushMetrics().then(() => {
            expect(prisma.metricRollup.createMany).toHaveBeenCalledTimes(1);
            const callArgs = vi.mocked(prisma.metricRollup.createMany).mock.calls[0][0];
            const data = Array.isArray(callArgs.data) ? callArgs.data[0] : callArgs.data;

            expect(data.count).toBe(2);
            expect(data.sum).toBe(300);
            expect(data.min).toBe(100);
            expect(data.max).toBe(200);
        });
    });

    it('should handle deterministic tag ordering', () => {
        telemetryV2.recordMetric('test.metric', 1, { a: '1', b: '2' });
        telemetryV2.recordMetric('test.metric', 1, { b: '2', a: '1' });

        expect(telemetryState.metricBuffer.size).toBe(1); // Same key
    });

    it('should drop metrics when buffer is full (MAX_BUFFER_SIZE)', () => {
        // Fill buffer
        // We mock the limit to be small for test? Or just loop 5000 times.
        // Looping 5000 times in memory test is fast enough.
        for (let i = 0; i < 5001; i++) {
            telemetryV2.recordMetric('test.overflow', 1, { id: i.toString() });
        }

        expect(telemetryState.metricBuffer.size).toBe(5000);
        // The 5001th should be dropped
    });

    it('should flush logs when batch size is reached', async () => {
        // BRONZE_BATCH_SIZE is 50
        for (let i = 0; i < 50; i++) {
            telemetryV2.recordLog('INFO', 'Test Log');
        }

        // Allow microtasks to process (async flush)
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(prisma.logEntry.createMany).toHaveBeenCalled();
    });
});
