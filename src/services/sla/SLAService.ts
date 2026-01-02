import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

// Local Type Definitions (Fallback until npx prisma generate succeeds)
export interface SLADefinition {
  id: string;
  serviceId: string;
  name: string;
  version: number;
  target: number;
  window: string;
  metricType: string;
  activeFrom: Date;
  activeTo: Date | null;
}

export interface SLASnapshot {
  id: string;
  date: Date;
  slaDefinitionId: string;
  totalEvents: number;
  errorEvents: number;
  uptimePercentage: number;
  breachCount: number;
  errorBudgetBurn: number;
  metadata: Prisma.JsonValue | null;
}

export class SLAService {
  /**
   * Calculates and persists the SLA Snapshot for a specific service and date.
   * Typically run as a nightly job for the previous day.
   */
  async generateDailySnapshot(slaId: string, targetDate: Date): Promise<SLASnapshot | null> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // 1. Fetch Definition
      const definition = await prisma.sLADefinition.findUnique({
        where: { id: slaId },
      });

      if (!definition) {
        logger.error('[SLA] Definition not found', { slaId });
        return null;
      }

      // 2. Fetch Aggregated Metrics
      let totalRequests = 0;
      let errorRequests = 0;
      let breachCount = 0;
      let calculatedValue = 100.0;
      let metadata: Prisma.JsonValue = {};

      if (definition.metricType === 'UPTIME' || definition.metricType === 'AVAILABILITY') {
        const metrics = await prisma.metricRollup.findMany({
          where: {
            serviceId: definition.serviceId,
            name: 'http.request.status', // Convention: Track status codes
            bucket: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        // Calculate Availability
        for (const m of metrics) {
          const count = m.count;
          // If we tag status=5xx, we count as error
          const tags = m.tags as Record<string, string>;
          if (tags.status && tags.status.startsWith('5')) {
            errorRequests += count;
          }
          totalRequests += count;
        }

        if (totalRequests > 0) {
          calculatedValue = ((totalRequests - errorRequests) / totalRequests) * 100;
        } else {
          // No traffic? Assume 100% uptime if no errors reported
          calculatedValue = 100;
        }
      } else if (definition.metricType === 'MTTA' || definition.metricType === 'MTTR') {
        // MTTA = Mean Time To Acknowledge
        // MTTR = Mean Time To Resolve
        const isMTTA = definition.metricType === 'MTTA';
        const dateRange = {
          gte: startOfDay,
          lte: endOfDay,
        };
        const incidentWhere: Prisma.IncidentWhereInput = {
          serviceId: definition.serviceId,
        };
        if (isMTTA) {
          incidentWhere.acknowledgedAt = dateRange;
        } else {
          incidentWhere.resolvedAt = dateRange;
        }

        // Find incidents that were Acked/Resolved on this day
        // Using 'any' cast as fallback
        const incidents = await prisma.incident.findMany({
          where: incidentWhere,
          select: {
            createdAt: true,
            acknowledgedAt: true,
            resolvedAt: true,
          },
        });

        let totalDurationMinutes = 0;
        let count = 0;

        for (const inc of incidents) {
          const end = isMTTA ? inc.acknowledgedAt : inc.resolvedAt;
          const start = inc.createdAt;

          if (end && start) {
            const endDate = new Date(end);
            const startDate = new Date(start);
            const diffMs = endDate.getTime() - startDate.getTime();
            const diffMins = diffMs / (1000 * 60);

            if (diffMins >= 0) {
              totalDurationMinutes += diffMins;
              count++;
            }
          }
        }

        if (count > 0) {
          calculatedValue = totalDurationMinutes / count;
          totalRequests = count;
          errorRequests = 0;
        } else {
          calculatedValue = 0;
        }

        // STORE EXACT SUMS for accurate long-term aggregation
        metadata = {
          totalDurationMinutes,
          incidentCount: count,
        };

        // LATENCY_P99 Logic
      } else if (definition.metricType === 'LATENCY_P99') {
        const metrics = await prisma.metricRollup.findMany({
          where: {
            serviceId: definition.serviceId,
            name: 'http.request.duration', // Convention: Latency metric
            bucket: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        let weightedSumP99 = 0;
        let totalCount = 0;

        // We don't have individual request data here (Silver Tier), only buckets.
        // We can't know exactly how many requests were < target if target != p99.
        // But for "Latency P99 SLA" (e.g. P99 < 500ms), we check if the DAILY P99 is < target.

        // 1. Calculate Daily P99 (Approximate from buckets)
        // A better approach for P99 aggregation is complex without histograms.
        // We will use a weighted average of bucket P99s as a reasonable proxy for Silver Tier.

        for (const m of metrics) {
          const count = m.count;
          const p99 = m.p99 || m.max; // Fallback to max if p99 missing

          if (count > 0) {
            weightedSumP99 += p99 * count;
            totalCount += count;
          }
        }

        if (totalCount > 0) {
          calculatedValue = weightedSumP99 / totalCount; // This is Avg P99, not true P99, but acceptable for Trends
          totalRequests = totalCount;
        } else {
          calculatedValue = 0;
        }

        // metadata storage
        metadata = {
          totalCount,
          avgP99: calculatedValue,
        };
      }

      // 3. Determine Compliance
      // For Availability, Higher is Better (> target)
      // For MTTA/MTTR/Latency, Lower is Better (< target)
      const higherIsBetter =
        definition.metricType === 'UPTIME' || definition.metricType === 'AVAILABILITY';

      let isBreach = false;
      if (higherIsBetter) {
        isBreach = calculatedValue < definition.target;
      } else {
        isBreach = calculatedValue > definition.target;
      }

      if (isBreach) breachCount = 1;

      // 4. Persist Snapshot (Gold Tier)
      // Idempotent upsert
      const snapshot = await prisma.sLASnapshot.upsert({
        where: {
          date_slaDefinitionId: {
            date: startOfDay,
            slaDefinitionId: slaId,
          },
        },
        update: {
          totalEvents: totalRequests,
          errorEvents: errorRequests,
          uptimePercentage: calculatedValue,
          breachCount: breachCount,
          metadata: metadata,
        },
        create: {
          date: startOfDay,
          slaDefinitionId: slaId,
          totalEvents: totalRequests,
          errorEvents: errorRequests,
          uptimePercentage: calculatedValue,
          breachCount: breachCount,
          metadata: metadata,
        },
      });

      return snapshot;
    } catch (error) {
      logger.error('[SLA] Failed to generate snapshot', { slaId, error });
      throw error;
    }
  }

  /**
   * Creates a default SLA definition for a newly onboarded service
   */
  async createDefaultSLA(serviceId: string): Promise<SLADefinition> {
    return await prisma.sLADefinition.create({
      data: {
        serviceId,
        name: 'Standard Availability (99.9%)',
        target: 99.9,
        metricType: 'UPTIME',
        window: '30d',
      },
    });
  }
}

export const slaService = new SLAService();
