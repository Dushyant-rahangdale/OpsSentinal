import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateSLAMetrics } from '@/lib/sla-server';
import { logger } from '@/lib/logger';

/**
 * SLA Compliance API
 *
 * Returns live compliance stats for all active SLA definitions.
 *
 * GET /api/sla/compliance
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all active SLA definitions
    const definitions = await prisma.sLADefinition.findMany({
      where: { activeTo: null },
      include: {
        service: { select: { id: true, name: true } },
      },
      orderBy: { activeFrom: 'desc' },
    });

    // Calculate compliance for each definition
    const complianceData = await Promise.all(
      definitions.map(async def => {
        try {
          // Calculate window in days
          let windowDays = 30;
          switch (def.window) {
            case '7d':
              windowDays = 7;
              break;
            case '30d':
              windowDays = 30;
              break;
            case '90d':
              windowDays = 90;
              break;
            case 'quarterly':
              windowDays = 90;
              break;
            case 'yearly':
              windowDays = 365;
              break;
          }

          // Get SLA metrics for this service
          const metrics = await calculateSLAMetrics({
            serviceId: def.serviceId || undefined,
            priority: def.priority || undefined,
            windowDays,
          });

          // Calculate current value based on metric type
          let currentValue: number | null = null;
          let breached = false;

          switch (def.metricType) {
            case 'UPTIME':
            case 'AVAILABILITY':
              // Calculate uptime from resolved incidents
              const totalMinutes = windowDays * 24 * 60;
              const downtimeMinutes =
                metrics.mttr !== null ? metrics.totalIncidents * metrics.mttr : 0;
              currentValue =
                totalMinutes > 0 ? ((totalMinutes - downtimeMinutes) / totalMinutes) * 100 : 100;
              currentValue = Math.max(0, Math.min(100, currentValue));
              breached = currentValue < def.target;
              break;
            case 'MTTA':
              // MTTA in minutes - lower is better
              currentValue = metrics.mttaP50 !== null ? metrics.mttaP50 : null;
              // For MTTA, target is max minutes allowed
              breached = currentValue !== null && currentValue > def.target;
              break;
            case 'MTTR':
              // MTTR in minutes - lower is better
              currentValue = metrics.mttrP50 !== null ? metrics.mttrP50 : null;
              breached = currentValue !== null && currentValue > def.target;
              break;
            case 'LATENCY_P99':
              currentValue = metrics.avgLatencyP99;
              breached = currentValue !== null && currentValue > def.target;
              break;
          }

          // Calculate trend (compare to previous period)
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (def.metricType === 'UPTIME' || def.metricType === 'AVAILABILITY') {
            // For uptime, higher is better
            if (metrics.previousPeriod.resolveRate < metrics.resolveRate) trend = 'up';
            else if (metrics.previousPeriod.resolveRate > metrics.resolveRate) trend = 'down';
          } else {
            // For time-based metrics, lower is better
            if (metrics.previousPeriod.mttr !== null && metrics.mttr !== null) {
              if (metrics.mttr < metrics.previousPeriod.mttr) trend = 'up';
              else if (metrics.mttr > metrics.previousPeriod.mttr) trend = 'down';
            }
          }

          return {
            definitionId: def.id,
            name: def.name,
            serviceId: def.serviceId,
            serviceName: def.service?.name ?? 'Global',
            metricType: def.metricType,
            target: def.target,
            window: def.window,
            currentValue,
            breached,
            trend,
            totalIncidents: metrics.totalIncidents,
            activeIncidents: metrics.activeIncidents,
            lastUpdated: new Date().toISOString(),
          };
        } catch (err) {
          logger.error('Failed to calculate compliance for definition', {
            definitionId: def.id,
            error: err,
          });
          return {
            definitionId: def.id,
            name: def.name,
            serviceId: def.serviceId,
            serviceName: def.service?.name ?? 'Global',
            metricType: def.metricType,
            target: def.target,
            window: def.window,
            currentValue: null,
            breached: false,
            trend: 'stable' as const,
            totalIncidents: 0,
            activeIncidents: 0,
            error: 'Failed to calculate',
            lastUpdated: new Date().toISOString(),
          };
        }
      })
    );

    // Calculate overall stats
    const totalDefinitions = complianceData.length;
    const breachedCount = complianceData.filter(c => c.breached).length;
    const healthyCount = totalDefinitions - breachedCount;
    const avgCompliance =
      complianceData
        .filter(
          c =>
            c.currentValue !== null &&
            (c.metricType === 'UPTIME' || c.metricType === 'AVAILABILITY')
        )
        .reduce((sum, c) => sum + (c.currentValue || 0), 0) /
      Math.max(
        1,
        complianceData.filter(
          c =>
            c.currentValue !== null &&
            (c.metricType === 'UPTIME' || c.metricType === 'AVAILABILITY')
        ).length
      );

    return NextResponse.json({
      definitions: complianceData,
      summary: {
        total: totalDefinitions,
        healthy: healthyCount,
        breached: breachedCount,
        avgCompliance: isNaN(avgCompliance) ? null : Math.round(avgCompliance * 100) / 100,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('SLA compliance calculation error', { error });
    return NextResponse.json({ error: 'Failed to calculate SLA compliance' }, { status: 500 });
  }
}
