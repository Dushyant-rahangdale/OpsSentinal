import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return jsonError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        role: true,
        teamMemberships: { select: { teamId: true } },
      },
    });

    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    const { calculateSLAMetrics } = await import('@/lib/sla-server');
    // Import type dynamically or just use inferred type if possible, but calculateSLAMetrics is dynamic import.
    // Better to define the object with proper typing.
    type SLAMetricsFilter = import('@/lib/sla-server').SLAMetricsFilter;

    const slaFilters: SLAMetricsFilter = {
      useOrScope: true,
    };

    if (user.role !== 'ADMIN' && user.role !== 'RESPONDER') {
      const teamIds = user.teamMemberships.map(membership => membership.teamId);
      slaFilters.teamId = teamIds;
      slaFilters.assigneeId = user.id;
    }

    const slaMetrics = await calculateSLAMetrics(slaFilters);
    const activeIncidentsCount = slaMetrics.activeCount;
    const criticalIncidentsCount = slaMetrics.criticalCount;
    // Retention info
    const retentionInfo = {
      isClipped: slaMetrics.isClipped,
      retentionDays: slaMetrics.retentionDays,
    };

    return jsonOk({ activeIncidentsCount, criticalIncidentsCount, ...retentionInfo }, 200);
  } catch (error) {
    logger.error('api.sidebar_stats.error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError('Failed to fetch stats', 500);
  }
}
