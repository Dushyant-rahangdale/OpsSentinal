import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Generate a unique ID when the server process starts
const SERVER_INSTANCE_ID = Date.now().toString();

/**
 * Health check endpoint
 * Returns the health status of the application and its dependencies
 * 
 * GET /api/health
 * 
 * Response:
 * {
 *   status: "healthy" | "degraded" | "unhealthy",
 *   timestamp: string,
 *   checks: {
 *     database: { status: "healthy" | "unhealthy", latency?: number },
 *     // Add more checks as needed
 *   }
 * }
 */
export async function GET(request: NextRequest) {
    const _startTime = Date.now();
    const mode = request.nextUrl.searchParams.get('mode') || 'liveness';
    const checks: Record<string, { status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> = {};

    if (mode === 'readiness') {
        // Check database connection with timeout
        try {
            const dbStartTime = Date.now();
            // Use Promise.race to add timeout
            const dbCheck = Promise.race([
                prisma.$queryRaw`SELECT 1`,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database connection timeout')), 5000)
                )
            ]);
            await dbCheck;
            const dbLatency = Date.now() - dbStartTime;

            checks.database = {
                status: 'healthy',
                latency: dbLatency,
            };
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            checks.database = {
                status: 'unhealthy',
                error: error.message || 'Database connection failed',
            };
        }
    }

    // Check memory usage
    try {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
        };

        // Consider unhealthy if heap used > 90% of heap total
        const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        checks.memory = {
            status: heapUsagePercent > 90 ? 'unhealthy' : 'healthy',
            latency: memUsageMB.heapUsed,
        };
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        checks.memory = {
            status: 'unhealthy',
            error: error.message,
        };
    }

    const readinessChecks = mode === 'readiness'
        ? Object.entries(checks).filter(([key]) => key !== 'memory').map(([, value]) => value)
        : Object.values(checks);
    const allHealthy = readinessChecks.length === 0
        ? true
        : readinessChecks.every(check => check.status === 'healthy');
    const anyUnhealthy = readinessChecks.some(check => check.status === 'unhealthy');

    const overallStatus = allHealthy
        ? 'healthy'
        : anyUnhealthy
            ? 'unhealthy'
            : 'degraded';

    const response = {
        status: overallStatus,
        mode,
        timestamp: new Date().toISOString(),
        checks,
        uptime: Math.round(process.uptime()),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        instanceId: SERVER_INSTANCE_ID,
    };

    const statusCode = mode === 'readiness'
        ? (overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503)
        : 200;

    // Add cache control headers
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json(response, { status: statusCode, headers });
}
