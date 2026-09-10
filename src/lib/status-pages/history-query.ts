import 'server-only';
import prisma from '@/lib/prisma';

export const HISTORY_INCIDENT_PAGE_SIZE = 1_000;

export type HistoryIncident = {
  id: string;
  serviceId: string;
  createdAt: Date;
  resolvedAt: Date | null;
  urgency: string;
  status: string;
};

/** Reads the complete window in bounded pages or rejects without returning partial history. */
export async function loadHistoryIncidentsByService(
  serviceIds: string[],
  earliestRequiredStart: Date,
  now: Date
): Promise<Map<string, HistoryIncident[]>> {
  const byService = new Map<string, HistoryIncident[]>();
  let cursor: string | undefined;

  while (true) {
    const page = await prisma.incident.findMany({
      where: {
        serviceId: { in: serviceIds },
        visibility: 'PUBLIC',
        status: { notIn: ['SUPPRESSED', 'SNOOZED'] },
        createdAt: { lt: now },
        OR: [{ resolvedAt: { gte: earliestRequiredStart } }, { resolvedAt: null }],
      },
      orderBy: { id: 'asc' },
      take: HISTORY_INCIDENT_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        serviceId: true,
        createdAt: true,
        resolvedAt: true,
        urgency: true,
        status: true,
      },
    });

    for (const incident of page) {
      const serviceIncidents = byService.get(incident.serviceId) ?? [];
      serviceIncidents.push(incident);
      byService.set(incident.serviceId, serviceIncidents);
    }
    if (page.length < HISTORY_INCIDENT_PAGE_SIZE) return byService;
    cursor = page.at(-1)?.id;
    if (!cursor) throw new Error('Status history pagination did not advance');
  }
}
