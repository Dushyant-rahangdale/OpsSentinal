import { NextRequest, NextResponse } from 'next/server';
import { calculateSLAMetrics } from '@/lib/sla-server';
import { serializeSlaMetrics } from '@/lib/sla';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Centralized Metrics API for Executive Dashboards
 *
 * Provides unified access to all SLA and operational metrics from sla-server.ts
 * Supports filtering by time range, team, service, and other dimensions.
 *
 * Query Parameters:
 * - window: number of days (default: 7)
 * - teamId: filter by team
 * - serviceId: filter by service
 * - assigneeId: filter by assignee
 * - urgency: filter by urgency level
 * - status: filter by incident status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const windowDays = Number(searchParams.get('window') || 7);
    const teamId = searchParams.get('teamId') || undefined;
    const serviceId = searchParams.get('serviceId') || undefined;
    const assigneeId = searchParams.get('assigneeId') || undefined;
    const urgency = searchParams.get('urgency') as 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
    const status = searchParams.get('status') as
      | 'OPEN'
      | 'ACKNOWLEDGED'
      | 'SNOOZED'
      | 'SUPPRESSED'
      | 'RESOLVED'
      | undefined;

    // Calculate metrics using the centralized SLA server
    const metrics = await calculateSLAMetrics({
      windowDays,
      teamId,
      serviceId,
      assigneeId,
      urgency,
      status,
    });

    // Serialize dates for JSON response
    const serialized = serializeSlaMetrics(metrics);

    return NextResponse.json({
      success: true,
      data: serialized,
      filters: {
        windowDays,
        teamId,
        serviceId,
        assigneeId,
        urgency,
        status,
      },
    });
  } catch (error) {
    console.error('[Reports Metrics API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
