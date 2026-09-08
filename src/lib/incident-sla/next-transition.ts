import prisma from '@/lib/prisma';
import { activeIncidentStatuses } from '@/lib/incident-status';
import { incidentSlaSelect } from './select';
import { getIncidentSlaTransitions } from './deadlines';

/** Returns the earliest future transition from frozen incident contracts only. */
export async function getNextIncidentSlaTransitionAt(now = new Date()): Promise<Date | null> {
  const incidents = await prisma.incident.findMany({
    where: { status: { in: activeIncidentStatuses() } },
    select: incidentSlaSelect,
  });
  let earliest: Date | null = null;
  for (const incident of incidents) {
    const candidate = getIncidentSlaTransitions(incident, { now }).nextTransitionAt;
    if (candidate && (!earliest || candidate < earliest)) earliest = candidate;
  }
  return earliest;
}
