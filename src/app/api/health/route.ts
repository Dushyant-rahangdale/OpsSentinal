import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
export async function GET() {
    const startTime = Date.now();
    const checks: Record<string, { status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> = {};

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
    } catch (error: any) {
        checks.database = {
            status: 'unhealthy',
            error: error.message || 'Database connection failed',
        };
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
    } catch (error: any) {
        checks.memory = {
            status: 'unhealthy',
            error: error.message,
        };
    }

    // Determine overall status
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy');
    
    const overallStatus = allHealthy 
        ? 'healthy' 
        : anyUnhealthy 
        ? 'unhealthy' 
        : 'degraded';

    const response = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
        uptime: Math.round(process.uptime()),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    // Add cache control headers
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json(response, { status: statusCode, headers });
}
