import type { PublicServiceStatus, PublicStatusHistorySegment } from './public-contract';
import { getWorstPublicStatus, publicStatusForIncidentUrgency } from './status-presentation';

/**
 * One canonical availability engine for every public surface.
 *
 * Current status, service history, and 30/90-day uptime are all derived from the *same* merged
 * health intervals, so the page, JSON API and exports can never disagree about the same service and
 * window. Maintenance is health, not downtime: it appears in history but is excluded from downtime,
 * matching how daily availability is rendered. Everything here is pure and deterministic ΓÇö identical
 * inputs always produce identical, stably ordered output.
 */

export type PublicHistoryIncident = {
  serviceId: string;
  createdAt: Date;
  resolvedAt: Date | null;
  urgency: string;
  status: string;
};

export type PublicHistoryMaintenance = {
  startDate: Date;
  endDate: Date | null;
  affectedServiceIds: string[];
};

/** A merged, non-overlapping span of non-operational health, in epoch milliseconds. */
export type HealthSegment = {
  start: number;
  end: number;
  status: Exclude<PublicServiceStatus, 'OPERATIONAL'>;
};

const DOWNTIME_STATUSES: ReadonlySet<PublicServiceStatus> = new Set([
  'DEGRADED',
  'PARTIAL_OUTAGE',
  'MAJOR_OUTAGE',
]);

/**
 * Collapse a service's incidents and maintenance into merged non-operational health segments.
 *
 * Overlaps resolve to the worst status (an incident always outranks concurrent maintenance), and
 * touching same-status spans are joined, so the result is the minimal canonical interval set.
 */
export function buildServiceHealthSegments({
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
}): HealthSegment[] {
  if (end <= start) return [];
  const windowStart = start.getTime();
  const windowEnd = end.getTime();
  const raw: HealthSegment[] = [];
  const add = (from: Date, to: Date, status: PublicServiceStatus) => {
    const boundedStart = Math.max(windowStart, from.getTime());
    const boundedEnd = Math.min(windowEnd, to.getTime());
    if (boundedEnd > boundedStart && status !== 'OPERATIONAL') {
      raw.push({ start: boundedStart, end: boundedEnd, status });
    }
  };

  for (const incident of incidents) {
    if (
      incident.serviceId !== serviceId ||
      incident.status === 'SUPPRESSED' ||
      incident.status === 'SNOOZED'
    )
      continue;
    add(
      incident.createdAt,
      incident.resolvedAt ?? end,
      publicStatusForIncidentUrgency(incident.urgency)
    );
  }
  for (const item of maintenance) {
    if (item.affectedServiceIds.length > 0 && !item.affectedServiceIds.includes(serviceId))
      continue;
    add(item.startDate, item.endDate ?? end, 'MAINTENANCE');
  }

  const points = [...new Set(raw.flatMap(segment => [segment.start, segment.end]))].sort(
    (a, b) => a - b
  );
  const merged: HealthSegment[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index];
    const to = points[index + 1];
    if (from === undefined || to === undefined) continue;
    const covering = raw.filter(segment => segment.start < to && segment.end > from);
    if (covering.length === 0) continue;
    const status = getWorstPublicStatus(covering.map(segment => segment.status));
    if (status === 'OPERATIONAL') continue;
    const previous = merged.at(-1);
    if (previous?.status === status && previous.end === from) previous.end = to;
    else merged.push({ start: from, end: to, status: status as HealthSegment['status'] });
  }
  return merged;
}

/** Intersect merged health segments with a sub-window, preserving order and merging touches. */
export function clipHealthSegments(
  segments: HealthSegment[],
  start: Date,
  end: Date
): HealthSegment[] {
  const windowStart = start.getTime();
  const windowEnd = end.getTime();
  const clipped: HealthSegment[] = [];
  for (const segment of segments) {
    const from = Math.max(windowStart, segment.start);
    const to = Math.min(windowEnd, segment.end);
    if (to <= from) continue;
    const previous = clipped.at(-1);
    if (previous?.status === segment.status && previous.end === from) previous.end = to;
    else clipped.push({ start: from, end: to, status: segment.status });
  }
  return clipped;
}

/** Serialize merged health segments to the public history contract shape. */
export function healthSegmentsToPublic(segments: HealthSegment[]): PublicStatusHistorySegment[] {
  return segments.map(segment => ({
    startAt: new Date(segment.start).toISOString(),
    endAt: new Date(segment.end).toISOString(),
    status: segment.status,
  }));
}

/**
 * Availability percentage over a window, from the same segments that drive history.
 *
 * Downtime is the clipped duration of degraded/partial/major spans; maintenance and operational
 * time count as available. A non-positive window has nothing to measure and reports 100.
 */
export function serviceUptimePercent(segments: HealthSegment[], start: Date, end: Date): number {
  const windowStart = start.getTime();
  const windowEnd = end.getTime();
  const total = windowEnd - windowStart;
  if (total <= 0) return 100;
  let down = 0;
  for (const segment of segments) {
    if (!DOWNTIME_STATUSES.has(segment.status)) continue;
    const from = Math.max(windowStart, segment.start);
    const to = Math.min(windowEnd, segment.end);
    if (to > from) down += to - from;
  }
  return Math.max(0, Math.min(100, ((total - down) / total) * 100));
}
