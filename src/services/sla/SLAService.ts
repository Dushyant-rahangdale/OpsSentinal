import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class SLAService {
  /**
   * Generate a daily SLA compliance snapshot for a specific definition and date
   * @param definitionId ID of the SLA definition
   * @param date Date representing the day (should be midnight)
   */
  async generateDailySnapshot(definitionId: string, date: Date): Promise<void> {
    const definition = await prisma.sLADefinition.findUnique({
      where: { id: definitionId },
    });

    if (!definition) {
      logger.warn(`[SLAService] Definition not found: ${definitionId}`);
      return;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Filter incidents based on definition scope
    const whereClause: any = {
      createdAt: { gte: startOfDay, lte: endOfDay },
    };

    if (definition.serviceId) {
      whereClause.serviceId = definition.serviceId;
    }
    if (definition.priority) {
      // Assuming priority maps to urgency for now, or use tags if structured
      // For simplicity, let's skip strict priority mapping unless urgency matches
    }

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true,
      },
    });

    let metAck = 0;
    let metResolve = 0;

    for (const incident of incidents) {
      // Check Ack Time
      if (definition.targetAckTime && incident.acknowledgedAt) {
        const ackTimeMinutes =
          (incident.acknowledgedAt.getTime() - incident.createdAt.getTime()) / 60000;
        if (ackTimeMinutes <= definition.targetAckTime) {
          metAck++;
        }
      }

      // Check Resolve Time
      if (definition.targetResolveTime && incident.resolvedAt) {
        const resolveTimeMinutes =
          (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 60000;
        if (resolveTimeMinutes <= definition.targetResolveTime) {
          metResolve++;
        }
      }
    }

    const total = incidents.length;
    // Simple compliance score: average of ack% and resolve% (if targets exist)
    let score = 100;
    if (total > 0) {
      const ackScore = definition.targetAckTime ? (metAck / total) * 100 : 100;
      const resolveScore = definition.targetResolveTime ? (metResolve / total) * 100 : 100;
      score = (ackScore + resolveScore) / 2;
    }

    await prisma.sLASnapshot.upsert({
      where: {
        date_slaDefinitionId: {
          date: startOfDay,
          slaDefinitionId: definitionId,
        },
      },
      create: {
        slaDefinitionId: definitionId,
        date: startOfDay,
        totalIncidents: total,
        metAckTime: metAck,
        metResolveTime: metResolve,
        complianceScore: score,
      },
      update: {
        totalIncidents: total,
        metAckTime: metAck,
        metResolveTime: metResolve,
        complianceScore: score,
      },
    });

    logger.info(`[SLAService] Snapshot generated`, { definitionId, date, score });
  }
}

export const slaService = new SLAService();
