import type {
  PublicHistorySlice,
  PublicServiceStatus,
  PublicStatusHistoryDay,
} from './public-contract';
import { getWorstPublicStatus } from './status-presentation';

const DAY_MS = 86_400_000;

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

function incidentStatus(urgency: string): PublicServiceStatus {
  if (urgency === 'HIGH') return 'MAJOR_OUTAGE';
  if (urgency === 'MEDIUM') return 'DEGRADED';
  if (urgency === 'LOW') return 'PARTIAL_OUTAGE';
  return 'UNKNOWN';
}

function overlapMinutes(start: Date, end: Date, dayStart: Date, dayEnd: Date) {
  const from = Math.max(start.getTime(), dayStart.getTime());
  const to = Math.min(end.getTime(), dayEnd.getTime());
  return {
    startMinute: Math.max(0, Math.floor((from - dayStart.getTime()) / 60_000)),
    endMinute: Math.min(1440, Math.ceil((to - dayStart.getTime()) / 60_000)),
  };
}

function mergeSlices(slices: PublicHistorySlice[]): PublicHistorySlice[] {
  const points = new Set([0, 1440]);
  for (const slice of slices) {
    points.add(slice.startMinute);
    points.add(slice.endMinute);
  }
  const sorted = [...points].sort((a, b) => a - b);
  const result: PublicHistorySlice[] = [];
  for (let index = 0; index < sorted.length - 1; index++) {
    const startMinute = sorted.at(index);
    const endMinute = sorted.at(index + 1);
    if (startMinute === undefined || endMinute === undefined) continue;
    const covering = slices.filter(
      slice => slice.startMinute < endMinute && slice.endMinute > startMinute
    );
    const status = covering.length
      ? getWorstPublicStatus(covering.map(slice => slice.status))
      : 'OPERATIONAL';
    const previous = result.at(-1);
    if (previous?.status === status) previous.endMinute = endMinute;
    else result.push({ startMinute, endMinute, status });
  }
  return result;
}

export function buildPublicServiceHistory({
  serviceId,
  incidents,
  maintenance,
  start,
  end,
}: {
  serviceId: string;
  incidents: PublicHistoryIncident[];
  maintenance: PublicHistoryMaintenance[];
  timezone?: string;
  start: Date;
  end: Date;
}): PublicStatusHistoryDay[] {
  const days: PublicStatusHistoryDay[] = [];
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(0, 0, 0, 0);

  while (cursor <= last) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const incidentSlices = incidents
      .filter(
        incident =>
          incident.serviceId === serviceId &&
          incident.status !== 'SUPPRESSED' &&
          incident.status !== 'SNOOZED' &&
          incident.createdAt < dayEnd &&
          (incident.resolvedAt ?? end) > dayStart
      )
      .map(incident => ({
        ...overlapMinutes(incident.createdAt, incident.resolvedAt ?? end, dayStart, dayEnd),
        status: incidentStatus(incident.urgency),
      }));
    const maintenanceSlices = maintenance
      .filter(
        item =>
          (item.affectedServiceIds.length === 0 || item.affectedServiceIds.includes(serviceId)) &&
          item.startDate < dayEnd &&
          (item.endDate ?? end) > dayStart
      )
      .map(item => ({
        ...overlapMinutes(item.startDate, item.endDate ?? end, dayStart, dayEnd),
        status: 'MAINTENANCE' as const,
      }));
    const timeline = mergeSlices([...incidentSlices, ...maintenanceSlices]);
    const elapsedMinutes = dayStart.getTime() === last.getTime()
      ? Math.max(1, Math.min(1440, Math.ceil((end.getTime() - dayStart.getTime()) / 60_000)))
      : 1440;
    const relevant = timeline
      .map(slice => ({ ...slice, endMinute: Math.min(slice.endMinute, elapsedMinutes) }))
      .filter(slice => slice.startMinute < slice.endMinute);
    const status = getWorstPublicStatus(relevant.map(slice => slice.status));
    const unavailable = relevant.reduce(
      (total, slice) => total + (slice.status === 'OPERATIONAL' ? 0 : slice.endMinute - slice.startMinute),
      0
    );
    days.push({
      date: dayStart.toISOString().slice(0, 10),
      status,
      incidentCount: incidentSlices.length,
      availabilityPercent: Number((((elapsedMinutes - unavailable) / elapsedMinutes) * 100).toFixed(3)),
      timeline: relevant,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
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
