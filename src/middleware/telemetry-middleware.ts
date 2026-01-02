import { NextRequest } from 'next/server';
import { telemetryV2 } from '@/services/telemetry/TelemetryServiceV2';
import { logger } from '@/lib/logger';

/**
 * Telemetry Middleware Helper
 * Records Silver Tier (Metrics) and optional Bronze Tier (Logs) for API requests.
 * designed to be "fire and forget" to avoid slowing down the request.
 */
export function recordRequestTelemetry(req: NextRequest, resStatus: number = 200, durationMs: number = 0) {
    try {
        const { pathname } = req.nextUrl;

        // Only record API routes to avoid noise from static assets
        if (!pathname.startsWith('/api')) return;

        // 1. Silver Tier (Metrics)
        // Record Latency
        const tags = {
            method: req.method,
            status: resStatus.toString(),
            path: standardizePath(pathname) // High cardinality protection
        };

        telemetryV2.recordMetric('http.request.duration', durationMs, tags);
        telemetryV2.recordMetric('http.request.status', 1, tags);

        // 2. Bronze Tier (Logs)
        // Smart Logging: Only log Errors or Slow Requests (Latency > 1s)
        // This solves the user's "13GB" concern by ignoring success noise.
        const isError = resStatus >= 400;
        const isSlow = durationMs > 1000;

        if (isError || isSlow) {
            telemetryV2.recordLog(
                isError ? 'ERROR' : 'WARN',
                `API Request ${isError ? 'Failed' : 'Slow'}`,
                {
                    method: req.method,
                    path: pathname,
                    status: resStatus,
                    duration: durationMs,
                    userAgent: req.headers.get('user-agent')
                }
            );
        }

    } catch (error) {
        // Fail silent - never crash the app for telemetry
        logger.error('Telemetry Middleware Error', { error });
    }
}

/**
 * Standardize paths to prevent high cardinality in metrics
 * e.g., /api/users/123 -> /api/users/:id
 */
function standardizePath(path: string): string {
    // Replace UUIDs and IDs with placeholders
    return path
        .replace(/\/([0-9a-fA-F-]{36})/, '/:uuid') // UUID
        .replace(/\/(\d+)/, '/:id');             // Numeric ID
}
