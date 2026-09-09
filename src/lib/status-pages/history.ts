import type {
  PublicHistorySlice,
  PublicServiceStatus,
  PublicStatusHistoryDay,
} from './public-contract';
import { getWorstPublicStatus, publicStatusForIncidentUrgency } from './status-presentation';
import {
  addDaysToDateKey,
  formatDateKeyInTimeZone,
  startOfDayFromDateKey,
  startOfNextDayFromDateKey,
} from '@/lib/timezone';

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

function overlapMinutes(start: Date, end: Date, dayStart: Date, dayEnd: Date) {
  const from = Math.max(start.getTime(), dayStart.getTime());
  const to = Math.min(end.getTime(), dayEnd.getTime());
  return {
    startMinute: Math.max(0, Math.floor((from - dayStart.getTime()) / 60_000)),
    endMinute: Math.min(
      Math.round((dayEnd.getTime() - dayStart.getTime()) / 60_000),
      Math.ceil((to - dayStart.getTime()) / 60_000)
    ),
  };
}

function mergeSlices(slices: PublicHistorySlice[], dayMinutes: number): PublicHistorySlice[] {
  const points = new Set([0, dayMinutes]);
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
  timezone,
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
  if (end <= start) return [];

  const days: PublicStatusHistoryDay[] = [];
  const historyTimeZone = timezone || 'UTC';
  let dateKey = formatDateKeyInTimeZone(start, historyTimeZone);
  // The history range is half-open. An end exactly at local midnight belongs to
  // the preceding day and must not create a zero-length trailing cell.
  const lastDateKey = formatDateKeyInTimeZone(new Date(end.getTime() - 1), historyTimeZone);
  const incidentSlicesByDate = new Map<string, PublicHistorySlice[]>();
  const maintenanceSlicesByDate = new Map<string, PublicHistorySlice[]>();

  const addInterval = (
    intervalStart: Date,
    intervalEnd: Date,
    status: PublicServiceStatus,
    target: Map<string, PublicHistorySlice[]>
  ) => {
    const boundedStart = new Date(Math.max(start.getTime(), intervalStart.getTime()));
    const boundedEnd = new Date(Math.min(end.getTime(), intervalEnd.getTime()));
    if (boundedEnd <= boundedStart) return;
    let intervalDateKey = formatDateKeyInTimeZone(boundedStart, historyTimeZone);
    const intervalLastDateKey = formatDateKeyInTimeZone(
      new Date(boundedEnd.getTime() - 1),
      historyTimeZone
    );
    while (intervalDateKey <= intervalLastDateKey) {
      const dayStart = startOfDayFromDateKey(intervalDateKey, historyTimeZone);
      const dayEnd = startOfNextDayFromDateKey(intervalDateKey, historyTimeZone);
      const slices = target.get(intervalDateKey) ?? [];
      slices.push({ ...overlapMinutes(boundedStart, boundedEnd, dayStart, dayEnd), status });
      target.set(intervalDateKey, slices);
      intervalDateKey = addDaysToDateKey(intervalDateKey, 1);
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
      publicStatusForIncidentUrgency(incident.urgency),
      incidentSlicesByDate
    );
  }
  for (const item of maintenance) {
    if (item.affectedServiceIds.length > 0 && !item.affectedServiceIds.includes(serviceId)) continue;
    addInterval(item.startDate, item.endDate ?? end, 'MAINTENANCE', maintenanceSlicesByDate);
  }

  while (dateKey <= lastDateKey) {
    const dayStart = startOfDayFromDateKey(dateKey, historyTimeZone);
    const dayEnd = startOfNextDayFromDateKey(dateKey, historyTimeZone);
    const dayMinutes = Math.round((dayEnd.getTime() - dayStart.getTime()) / 60_000);
    const incidentSlices = incidentSlicesByDate.get(dateKey) ?? [];
    const maintenanceSlices = maintenanceSlicesByDate.get(dateKey) ?? [];
    const timeline = mergeSlices([...incidentSlices, ...maintenanceSlices], dayMinutes);
    const measuredStartMinute = Math.max(
      0,
      Math.min(dayMinutes, Math.floor((start.getTime() - dayStart.getTime()) / 60_000))
    );
    const measuredEndMinute = Math.max(
      measuredStartMinute + 1,
      Math.min(dayMinutes, Math.ceil((end.getTime() - dayStart.getTime()) / 60_000))
    );
    const elapsedMinutes = measuredEndMinute - measuredStartMinute;
    const relevant = timeline
      .map(slice => ({
        ...slice,
        startMinute: Math.max(slice.startMinute, measuredStartMinute),
        endMinute: Math.min(slice.endMinute, measuredEndMinute),
      }))
      .filter(slice => slice.startMinute < slice.endMinute);
    const status = getWorstPublicStatus(relevant.map(slice => slice.status));
    const unavailable = relevant.reduce(
      (total, slice) => total + (
        slice.status === 'DEGRADED' || slice.status === 'PARTIAL_OUTAGE' ||
        slice.status === 'MAJOR_OUTAGE' || slice.status === 'UNKNOWN'
          ? slice.endMinute - slice.startMinute
          : 0
      ),
      0
    );
    days.push({
      date: dateKey,
      status,
      incidentCount: incidentSlices.length,
      availabilityPercent: Number((((elapsedMinutes - unavailable) / elapsedMinutes) * 100).toFixed(3)),
      timeline: relevant,
    });
    dateKey = addDaysToDateKey(dateKey, 1);
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
