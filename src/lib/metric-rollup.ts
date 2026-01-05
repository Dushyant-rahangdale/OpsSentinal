// import 'server-only';
import { logger } from './logger';
import { getRetentionPolicy } from './retention-policy';

/**
 * Metric Rollup Service
 *
 * Generates and queries pre-aggregated metrics for historical data.
 * This enables fast queries on large datasets without loading all records.
 *
 * Rollup Strategy:
 * - Daily rollups: Generated for each day, per-service and global
 * - Weekly rollups: Generated from daily rollups
 * - Monthly rollups: Generated from daily rollups
 */

export interface RollupData {
  date: Date;
  granularity: 'daily' | 'weekly' | 'monthly';
  serviceId: string | null;
  teamId: string | null;

  // Counts
  totalIncidents: number;
  openIncidents: number;
  acknowledgedIncidents: number;
  resolvedIncidents: number;
  highUrgencyIncidents: number;
  mediumUrgencyIncidents: number;
  lowUrgencyIncidents: number;

  // SLA Metrics
  mttaSum: bigint;
  mttaCount: number;
  mttrSum: bigint;
  mttrCount: number;

  // SLA Compliance
  ackSlaMet: number;
  ackSlaBreached: number;
  resolveSlaMet: number;
  resolveSlaBreached: number;

  // Events
  escalationCount: number;
  reopenCount: number;
  autoResolveCount: number;
  alertCount: number;

  // After Hours
  afterHoursCount: number;
}

/**
 * Generates daily rollups for a specific date
 * Should be called by a scheduled job (e.g., daily at 1 AM)
 */
export async function generateDailyRollup(
  date: Date,
  serviceId?: string,
  teamId?: string
): Promise<void> {
  const { default: prisma } = await import('./prisma');

  // Validate date is not in future
  const now = new Date();
  if (date > now) {
    throw new Error(`Cannot generate rollup for future date: ${date.toISOString()}`);
  }

  // Validate date is not too old (beyond retention)
  const { getRetentionPolicy } = await import('./retention-policy');
  const policy = await getRetentionPolicy();
  const oldestAllowed = new Date();
  oldestAllowed.setDate(oldestAllowed.getDate() - policy.metricsRetentionDays);

  if (date < oldestAllowed) {
    logger.warn(
      '[MetricRollup] Date is beyond retention period, will generate but may be cleaned up soon',
      {
        date: date.toISOString(),
        retentionDays: policy.metricsRetentionDays,
      }
    );
  }

  // Set date boundaries (start of day to end of day in UTC)
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  // Idempotency check: Skip if rollup already exists (unless force regeneration)
  const existingRollup = await prisma.incidentMetricRollup.findFirst({
    where: {
      date: dayStart,
      serviceId: serviceId || null,
      teamId: teamId || null,
      granularity: 'daily',
    },
  });

  if (existingRollup) {
    logger.debug('[MetricRollup] Rollup already exists, updating...', {
      date: dayStart.toISOString(),
      serviceId,
      teamId,
    });
  }

  // Build where clause
  const whereClause: any = {
    createdAt: { gte: dayStart, lte: dayEnd },
  };
  if (serviceId) whereClause.serviceId = serviceId;
  if (teamId) whereClause.teamId = teamId;

  try {
    // Use transaction for atomic rollup generation
    await prisma.$transaction(
      async tx => {
        // Fetch all incidents for the day
        const incidents = await tx.incident.findMany({
          where: whereClause,
          select: {
            id: true,
            status: true,
            urgency: true,
            createdAt: true,
            acknowledgedAt: true,
            resolvedAt: true,
            serviceId: true,
            service: {
              select: {
                targetAckMinutes: true,
                targetResolveMinutes: true,
              },
            },
          },
        });

        // Calculate metrics
        const totalIncidents = incidents.length;
        let openIncidents = 0;
        let acknowledgedIncidents = 0;
        let resolvedIncidents = 0;
        let highUrgencyIncidents = 0;
        let mediumUrgencyIncidents = 0;
        let lowUrgencyIncidents = 0;
        let mttaSum = BigInt(0);
        let mttaCount = 0;
        let mttrSum = BigInt(0);
        let mttrCount = 0;
        let ackSlaMet = 0;
        let ackSlaBreached = 0;
        let resolveSlaMet = 0;
        let resolveSlaBreached = 0;
        let afterHoursCount = 0;

        const DEFAULT_ACK_TARGET = 15;
        const DEFAULT_RESOLVE_TARGET = 120;

        for (const incident of incidents) {
          // Status counts
          switch (incident.status) {
            case 'OPEN':
              openIncidents++;
              break;
            case 'ACKNOWLEDGED':
              acknowledgedIncidents++;
              break;
            case 'RESOLVED':
              resolvedIncidents++;
              break;
          }

          // Urgency counts
          switch (incident.urgency) {
            case 'HIGH':
              highUrgencyIncidents++;
              break;
            case 'MEDIUM':
              mediumUrgencyIncidents++;
              break;
            case 'LOW':
              lowUrgencyIncidents++;
              break;
          }

          // MTTA calculation
          if (incident.acknowledgedAt) {
            const mtta = incident.acknowledgedAt.getTime() - incident.createdAt.getTime();
            if (mtta >= 0) {
              mttaSum += BigInt(mtta);
              mttaCount++;

              // SLA compliance
              const targetAck = incident.service?.targetAckMinutes || DEFAULT_ACK_TARGET;
              if (mtta / 60000 <= targetAck) {
                ackSlaMet++;
              } else {
                ackSlaBreached++;
              }
            }
          }

          // MTTR calculation
          if (incident.status === 'RESOLVED' && incident.resolvedAt) {
            const mttr = incident.resolvedAt.getTime() - incident.createdAt.getTime();
            if (mttr >= 0) {
              mttrSum += BigInt(mttr);
              mttrCount++;

              // SLA compliance
              const targetResolve =
                incident.service?.targetResolveMinutes || DEFAULT_RESOLVE_TARGET;
              if (mttr / 60000 <= targetResolve) {
                resolveSlaMet++;
              } else {
                resolveSlaBreached++;
              }
            }
          }

          // After hours check (using UTC for consistency in rollups)
          const hour = incident.createdAt.getUTCHours();
          const day = incident.createdAt.getUTCDay();
          const isWeekend = day === 0 || day === 6;
          const isAfterHours = hour < 8 || hour >= 18;
          if (isWeekend || isAfterHours) {
            afterHoursCount++;
          }
        }

        // Fetch event counts (use tx for transaction consistency)
        const incidentIds = incidents.map(i => i.id);
        const [escalationCount, reopenCount, autoResolveCount, alertCount] = incidentIds.length
          ? await Promise.all([
              tx.incidentEvent.count({
                where: {
                  incidentId: { in: incidentIds },
                  message: { contains: 'escalated to', mode: 'insensitive' },
                },
              }),
              tx.incidentEvent.count({
                where: {
                  incidentId: { in: incidentIds },
                  message: { contains: 'reopen', mode: 'insensitive' },
                },
              }),
              tx.incidentEvent.count({
                where: {
                  incidentId: { in: incidentIds },
                  message: { contains: 'auto-resolved', mode: 'insensitive' },
                },
              }),
              tx.alert.count({
                where: {
                  createdAt: { gte: dayStart, lte: dayEnd },
                  ...(serviceId ? { serviceId } : {}),
                },
              }),
            ])
          : [0, 0, 0, 0];

        // Upsert the rollup - use a unique approach since composite key has nullable fields
        const existingRollup = await tx.incidentMetricRollup.findFirst({
          where: {
            date: dayStart,
            granularity: 'daily',
            serviceId: serviceId ?? null,
            teamId: teamId ?? null,
          },
        });

        if (existingRollup) {
          await tx.incidentMetricRollup.update({
            where: { id: existingRollup.id },
            data: {
              totalIncidents,
              openIncidents,
              acknowledgedIncidents,
              resolvedIncidents,
              highUrgencyIncidents,
              mediumUrgencyIncidents,
              lowUrgencyIncidents,
              mttaSum,
              mttaCount,
              mttrSum,
              mttrCount,
              ackSlaMet,
              ackSlaBreached,
              resolveSlaMet,
              resolveSlaBreached,
              escalationCount,
              reopenCount,
              autoResolveCount,
              alertCount,
              afterHoursCount,
            },
          });
        } else {
          await tx.incidentMetricRollup.create({
            data: {
              date: dayStart,
              granularity: 'daily',
              serviceId: serviceId ?? null,
              teamId: teamId ?? null,
              totalIncidents,
              openIncidents,
              acknowledgedIncidents,
              resolvedIncidents,
              highUrgencyIncidents,
              mediumUrgencyIncidents,
              lowUrgencyIncidents,
              mttaSum,
              mttaCount,
              mttrSum,
              mttrCount,
              ackSlaMet,
              ackSlaBreached,
              resolveSlaMet,
              resolveSlaBreached,
              escalationCount,
              reopenCount,
              autoResolveCount,
              alertCount,
              afterHoursCount,
            },
          });
        }

        logger.info('[MetricRollup] Daily rollup generated', {
          date: dayStart.toISOString(),
          serviceId,
          teamId,
          totalIncidents,
        });
      },
      {
        timeout: 30000, // 30 second timeout for large datasets
        isolationLevel: 'Serializable' as const, // Prevent concurrent conflicts
      }
    );
  } catch (error) {
    logger.error('[MetricRollup] Failed to generate daily rollup', {
      error,
      date,
      serviceId,
      teamId,
    });
    throw error;
  }
}

/**
 * Generates rollups for all services for a given date
 */
export async function generateAllDailyRollups(date: Date): Promise<void> {
  const { default: prisma } = await import('./prisma');

  // Generate global rollup (no service filter)
  await generateDailyRollup(date);

  // Generate per-service rollups
  const services = await prisma.service.findMany({
    select: { id: true },
  });

  for (const service of services) {
    await generateDailyRollup(date, service.id);
  }

  logger.info('[MetricRollup] All daily rollups generated', {
    date: date.toISOString(),
    serviceCount: services.length,
  });
}

/**
 * Backfill rollups for a date range
 * Useful for initial setup or recovery
 */
export async function backfillRollups(
  startDate: Date,
  endDate: Date,
  serviceId?: string
): Promise<void> {
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  let count = 0;
  while (current <= end) {
    await generateDailyRollup(current, serviceId);
    current.setDate(current.getDate() + 1);
    count++;
  }

  logger.info('[MetricRollup] Backfill completed', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    daysProcessed: count,
  });
}

/**
 * Queries rollup data for a date range
 * Returns aggregated metrics from pre-computed rollups
 */
export async function queryRollupMetrics(
  startDate: Date,
  endDate: Date,
  options: {
    serviceId?: string;
    teamId?: string;
    granularity?: 'daily' | 'weekly' | 'monthly';
  } = {}
): Promise<{
  totalIncidents: number;
  resolvedIncidents: number;
  avgMtta: number | null;
  avgMttr: number | null;
  ackCompliance: number | null;
  resolveCompliance: number | null;
  afterHoursRate: number;
  rollupCount: number;
}> {
  const { default: prisma } = await import('./prisma');

  const granularity = options.granularity || 'daily';

  const rollups = await prisma.incidentMetricRollup.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      granularity,
      serviceId: options.serviceId || null,
      teamId: options.teamId || null,
    },
    select: {
      totalIncidents: true,
      resolvedIncidents: true,
      mttaSum: true,
      mttaCount: true,
      mttrSum: true,
      mttrCount: true,
      ackSlaMet: true,
      ackSlaBreached: true,
      resolveSlaMet: true,
      resolveSlaBreached: true,
      afterHoursCount: true,
    },
  });

  if (rollups.length === 0) {
    return {
      totalIncidents: 0,
      resolvedIncidents: 0,
      avgMtta: null,
      avgMttr: null,
      ackCompliance: null,
      resolveCompliance: null,
      afterHoursRate: 0,
      rollupCount: 0,
    };
  }

  // Aggregate rollups
  let totalIncidents = 0;
  let resolvedIncidents = 0;
  let mttaSum = BigInt(0);
  let mttaCount = 0;
  let mttrSum = BigInt(0);
  let mttrCount = 0;
  let ackSlaMet = 0;
  let ackSlaBreached = 0;
  let resolveSlaMet = 0;
  let resolveSlaBreached = 0;
  let afterHoursCount = 0;

  for (const rollup of rollups) {
    totalIncidents += rollup.totalIncidents;
    resolvedIncidents += rollup.resolvedIncidents;
    mttaSum += rollup.mttaSum;
    mttaCount += rollup.mttaCount;
    mttrSum += rollup.mttrSum;
    mttrCount += rollup.mttrCount;
    ackSlaMet += rollup.ackSlaMet;
    ackSlaBreached += rollup.ackSlaBreached;
    resolveSlaMet += rollup.resolveSlaMet;
    resolveSlaBreached += rollup.resolveSlaBreached;
    afterHoursCount += rollup.afterHoursCount;
  }

  const avgMtta = mttaCount > 0 ? Number(mttaSum / BigInt(mttaCount)) / 60000 : null; // Convert to minutes
  const avgMttr = mttrCount > 0 ? Number(mttrSum / BigInt(mttrCount)) / 60000 : null;

  const totalAckEvaluated = ackSlaMet + ackSlaBreached;
  const ackCompliance = totalAckEvaluated > 0 ? (ackSlaMet / totalAckEvaluated) * 100 : null;

  const totalResolveEvaluated = resolveSlaMet + resolveSlaBreached;
  const resolveCompliance =
    totalResolveEvaluated > 0 ? (resolveSlaMet / totalResolveEvaluated) * 100 : null;

  const afterHoursRate = totalIncidents > 0 ? (afterHoursCount / totalIncidents) * 100 : 0;

  return {
    totalIncidents,
    resolvedIncidents,
    avgMtta,
    avgMttr,
    ackCompliance,
    resolveCompliance,
    afterHoursRate,
    rollupCount: rollups.length,
  };
}

/**
 * Cleanup old rollups beyond retention period
 */
export async function cleanupOldRollups(): Promise<number> {
  const { default: prisma } = await import('./prisma');
  const policy = await getRetentionPolicy();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy.metricsRetentionDays);

  const result = await prisma.incidentMetricRollup.deleteMany({
    where: {
      date: { lt: cutoffDate },
    },
  });

  logger.info('[MetricRollup] Cleanup completed', {
    deletedCount: result.count,
    cutoffDate: cutoffDate.toISOString(),
  });

  return result.count;
}
