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

    // Build efficient Where clause for Active Incidents
    const where: Prisma.IncidentWhereInput = {
      status: { notIn: ['RESOLVED', 'SNOOZED', 'SUPPRESSED'] },
    };

    // Apply Scope Permissions
    if (user.role !== 'ADMIN' && user.role !== 'RESPONDER') {
      const teamIds = user.teamMemberships.map(membership => membership.teamId);

      // Use OR scope: Assigned to user OR Assigned to user's teams OR Service owned by user's teams
      where.OR = [
        { assigneeId: user.id },
        { teamId: { in: teamIds } },
        { service: { teamId: { in: teamIds } } },
      ];
    }

    // Group by Urgency to get breakdown
    const urgencyCounts = await prisma.incident.groupBy({
      by: ['urgency'],
      where,
      _count: { _all: true },
    });

    const activeIncidentsCount = urgencyCounts.reduce((acc, curr) => acc + curr._count._all, 0);
    const criticalIncidentsCount = urgencyCounts.find(u => u.urgency === 'HIGH')?._count._all || 0;
    const mediumIncidentsCount = urgencyCounts.find(u => u.urgency === 'MEDIUM')?._count._all || 0;
    const lowIncidentsCount = urgencyCounts.find(u => u.urgency === 'LOW')?._count._all || 0;

    // Retention info (Mocking or fetching separately if needed, but sidebar usually doesn't need strict retention info)
    // We'll return nulls or defaults as this is just for the badge
    const retentionInfo = {
      isClipped: false,
      retentionDays: 90, // Default assumption
    };

    return jsonOk(
      {
        activeIncidentsCount,
        criticalIncidentsCount,
        mediumIncidentsCount,
        lowIncidentsCount,
        ...retentionInfo,
      },
      200
    );
  } catch (error) {
    logger.error('api.sidebar_stats.error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError('Failed to fetch stats', 500);
  }
}
