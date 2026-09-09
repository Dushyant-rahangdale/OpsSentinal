import type {
  PublicServiceStatus,
  PublicStatusHistorySegment,
} from './public-contract';
import { getWorstPublicStatus, publicStatusForIncidentUrgency } from './status-presentation';

export interface PublicHistoryIncident {
  serviceId: string;
  createdAt: Date;
  resolvedAt: Date | null;
  urgency: string;
  status: string;
}

export interface PublicHistoryMaintenance {
  startDate: Date;
  endDate: Date | null;
  affectedServiceIds: string[];
}

export function buildPublicHistorySegments({
  serviceId,
  incidents,
  maintenance,
  start,
  end,
}: {
  serviceId: string;
  incidents: PublicHistoryIncident[];
  maintenance: PublicHistoryMaintenance[];
  start: Date;
  end: Date;
}): PublicStatusHistorySegment[] {
  if (end <= start) return [];
  const intervals: Array<{ start: number; end: number; status: PublicServiceStatus }> = [];
  const addInterval = (intervalStart: Date, intervalEnd: Date, status: PublicServiceStatus) => {
    const boundedStart = Math.max(start.getTime(), intervalStart.getTime());
    const boundedEnd = Math.min(end.getTime(), intervalEnd.getTime());
    if (boundedEnd > boundedStart && status !== 'OPERATIONAL') {
      intervals.push({ start: boundedStart, end: boundedEnd, status });
    }
  };

  for (const incident of incidents) {
    if (
      incident.serviceId !== serviceId ||
      incident.status === 'SUPPRESSED' ||
      incident.status === 'SNOOZED'
    ) continue;
    addInterval(
      incident.createdAt,
      incident.resolvedAt ?? end,
      publicStatusForIncidentUrgency(incident.urgency)
    );
  }
  for (const item of maintenance) {
    if (item.affectedServiceIds.length > 0 && !item.affectedServiceIds.includes(serviceId)) continue;
    addInterval(item.startDate, item.endDate ?? end, 'MAINTENANCE');
  }

  const points = [...new Set(intervals.flatMap(interval => [interval.start, interval.end]))]
    .sort((a, b) => a - b);
  const segments: PublicStatusHistorySegment[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const segmentStart = points.at(index);
    const segmentEnd = points.at(index + 1);
    if (segmentStart === undefined || segmentEnd === undefined) continue;
    const covering = intervals.filter(item => item.start < segmentEnd && item.end > segmentStart);
    if (covering.length === 0) continue;
    const status = getWorstPublicStatus(covering.map(item => item.status));
    if (status === 'OPERATIONAL') continue;
    const previous = segments.at(-1);
    const startAt = new Date(segmentStart).toISOString();
    const endAt = new Date(segmentEnd).toISOString();
    if (previous?.status === status && previous.endAt === startAt) previous.endAt = endAt;
    else segments.push({ startAt, endAt, status });
  }
  return segments;
}

export function aggregatePublicRegions(
  services: Array<{ id: string; regions?: string[]; status: PublicServiceStatus }>
) {
  const regionServices = new Map<string, typeof services>();
  for (const service of services) {
    for (const region of service.regions ?? []) {
      const current = regionServices.get(region) ?? [];
      current.push(service);
      regionServices.set(region, current);
    }
  }
  return [...regionServices.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, members]) => {
    const count = (status: PublicServiceStatus) => members.filter(item => item.status === status).length;
    return {
      name,
      status: getWorstPublicStatus(members.map(item => item.status)),
      totalServices: members.length,
      operationalServices: count('OPERATIONAL'),
      degradedServices: count('DEGRADED'),
      maintenanceServices: count('MAINTENANCE'),
      partialOutageServices: count('PARTIAL_OUTAGE'),
      majorOutageServices: count('MAJOR_OUTAGE'),
      unknownServices: count('UNKNOWN'),
      impactedServices: members.filter(item => item.status !== 'OPERATIONAL').length,
      serviceIds: members.map(item => item.id),
    };
  });
}
