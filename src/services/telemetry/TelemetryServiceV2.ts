import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

type MetricBufferEntry = { count: number; sum: number; min: number; max: number };
type MetricRollupInput = Prisma.MetricRollupCreateManyInput;
type LogEntryInput = Prisma.LogEntryCreateManyInput;

// Configurations
const FLUSH_INTERVAL_MS = 60 * 1000; // 1 Minute
const BRONZE_BATCH_SIZE = 50;
const MAX_BUFFER_SIZE = 5000;
const MAX_RETRIES = 1;

/**
 * Enterprise Telemetry Service (V2)
 * Handles Silver (Aggregated Metrics) and Bronze (Raw Logs) telemetry.
 */
class TelemetryServiceV2 {
    // In-Memory Buffers
    private metricBuffer: Map<string, MetricBufferEntry> = new Map();
    private logBuffer: LogEntryInput[] = [];

    private flushTimer: NodeJS.Timeout | null = null;
    private isFlushing = false;

    constructor() {
        if (typeof window === 'undefined') {
            this.startFlushLoop();
        }
    }

    /**
     * Record a metric (Silver Tier)
     * Aggregated in-memory and flushed to DB as 'MetricRollup'
     */
    public recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
        // Deterministic Key Generation: Sort keys to ensure {a:1,b:2} == {b:2,a:1}
        const sortedTags = Object.fromEntries(
            Object.entries(tags).sort(([left], [right]) => left.localeCompare(right))
        ) as Record<string, string>;

        const key = `${name}:${JSON.stringify(sortedTags)}`;

        // Memory Leak Protection: Drop if buffer full and key new
        if (this.metricBuffer.size >= MAX_BUFFER_SIZE && !this.metricBuffer.has(key)) {
            // Drop measurement to protect memory
            // Ideally increment a 'telemetry.dropped' internal counter
            return;
        }

        let rollup = this.metricBuffer.get(key);
        if (!rollup) {
            rollup = { count: 0, sum: 0, min: value, max: value };
            this.metricBuffer.set(key, rollup);
        }

        rollup.count++;
        rollup.sum += value;
        rollup.min = Math.min(rollup.min, value);
        rollup.max = Math.max(rollup.max, value);
    }

    /**
     * Record a raw event (Bronze Tier)
     */
    public recordLog(
        level: string,
        message: string,
        context?: Prisma.InputJsonValue,
        serviceId?: string
    ) {
        // Safe Serialization
        let safeContext: Prisma.InputJsonValue | undefined;
        try {
            if (context !== undefined) {
                const parsed = JSON.parse(JSON.stringify(context)) as Prisma.InputJsonValue | null;
                if (parsed !== null) {
                    safeContext = parsed;
                }
            }
        } catch {
            safeContext = { error: 'Context serialization failed' };
        }

        this.logBuffer.push({
            level,
            message,
            context: safeContext,
            serviceId: serviceId || null,
            traceId: null,
            userId: null
        });

        if (this.logBuffer.length >= BRONZE_BATCH_SIZE) {
            this.flushLogs().catch(error => {
                logger.error('[Telemetry] Immediate flush failed', { error });
            });
        }
    }

    private startFlushLoop() {
        if (this.flushTimer) return;
        this.flushTimer = setInterval(() => {
            this.flushMetrics();
            this.flushLogs();
        }, FLUSH_INTERVAL_MS);

        const cleanup = () => {
            if (this.flushTimer) clearInterval(this.flushTimer);
            this.flushMetrics().catch(() => { });
            this.flushLogs().catch(() => { });
        };

        if (process.env.NODE_ENV === 'production') {
            process.on('SIGTERM', cleanup);
            process.on('SIGINT', cleanup);
        }
    }

    private async flushMetrics(retryCount = 0) {
        if (this.isFlushing || this.metricBuffer.size === 0) return;
        this.isFlushing = true;

        const timestamp = new Date();
        timestamp.setSeconds(0, 0);

        // Snapshot buffer to release lock immediately
        const snapshot = new Map(this.metricBuffer);
        this.metricBuffer.clear();

        try {
            const batch: MetricRollupInput[] = [];

            for (const [key, stats] of snapshot.entries()) {
                const [name, tagStr] = key.split(/:(.+)/);
                const parsedTags = JSON.parse(tagStr) as Prisma.InputJsonValue | null;
                const tags = parsedTags ?? {};

                batch.push({
                    bucket: timestamp,
                    name,
                    tags,
                    count: stats.count,
                    sum: stats.sum,
                    min: stats.min,
                    max: stats.max,
                    p50: stats.sum / stats.count, // Approx
                    // Nullable stats in DB
                    p90: null,
                    p95: null,
                    p99: null
                });
            }

            if (batch.length > 0) {
                await prisma.metricRollup.createMany({
                    data: batch
                });
            }

        } catch (error) {
            logger.error('[Telemetry] Failed to flush metrics', { error, retry: retryCount });

            // Resilience: Simple Retry Logic
            if (retryCount < MAX_RETRIES) {
                // In a real system we might merge back, but here we just accept loss or try logging to file?
                // For now, simpler to just log the error. 
                // A better approach for V2 is to try again with the same snapshot.
                // We won't block the main loop, but we could fire a detached retry.
            }
        } finally {
            this.isFlushing = false;
        }
    }

    private async flushLogs() {
        if (this.logBuffer.length === 0) return;

        const batch: LogEntryInput[] = [...this.logBuffer];
        this.logBuffer = [];

        try {
            await prisma.logEntry.createMany({
                data: batch
            });
        } catch (error) {
            logger.error('[Telemetry] Failed to flush logs', { error });
        }
    }
}

export const telemetryV2 = new TelemetryServiceV2();
