import { NextResponse } from 'next/server';
import { getQueryStats, getSlowQueries, getRecentQueryErrors } from '@/lib/db-monitoring';

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

    return NextResponse.json({
      success: true,
      data: {
        stats,
        slowQueries,
        recentErrors,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching query stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch query statistics',
      },
      { status: 500 }
    );
  }
}

