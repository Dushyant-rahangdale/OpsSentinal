import { NextResponse } from 'next/server';
import { getQueryStats, getSlowQueries, getRecentQueryErrors, getQueryDurationDistribution } from '@/lib/db-monitoring';
import { assertAdmin } from '@/lib/rbac';
import { logger } from '@/lib/logger';

/**
 * GET /api/monitoring/queries
 * Get database query monitoring statistics
 * 
 * Query params:
 * - timeWindow: Time window in milliseconds (optional, default: all time)
 * - slowThreshold: Threshold for slow queries in ms (optional, default: 100)
 * - limit: Limit for slow queries/errors (optional, default: 10)
 */
export async function GET(request: Request) {
  try {
    await assertAdmin();

    const { searchParams } = new URL(request.url);
    const timeWindow = searchParams.get('timeWindow')
      ? parseInt(searchParams.get('timeWindow')!, 10)
      : undefined;
    const slowThreshold = searchParams.get('slowThreshold')
      ? parseInt(searchParams.get('slowThreshold')!, 10)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 10;

    const stats = getQueryStats(timeWindow);
    const slowQueries = getSlowQueries(slowThreshold, limit);
    const recentErrors = getRecentQueryErrors(limit);
    const distribution = getQueryDurationDistribution(timeWindow);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        slowQueries,
        recentErrors,
        distribution,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    logger.error('[API] Error fetching query stats', { component: 'api-monitoring-queries', error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch query statistics',
      },
      { status: 500 }
    );
  }
}

