import type { HealthSegment, PublicHistoryIncident } from './availability-engine';

/**
 * Daily health rollups so a 90-day window reads ~90 rows/service instead of scanning raw incidents.
 *
 * Rollups are a cache of the canonical engine, not a second source of truth: they are aggregated
 * from the same health segments, and uptime read back from them equals what `serviceUptimePercent`
 * computes over the same range. Buckets are per-UTC-day milliseconds; a full-coverage day's
 * remainder is operational.
 */

const DAY_MS = 86_400_000;

export interface ServiceDailyHealth {
  /** UTC date key, YYYY-MM-DD. */
  date: string;
  operationalMs: number;
  degradedMs: number;
  maintenanceMs: number;
  partialOutageMs: number;
  majorOutageMs: number;
  unknownMs: number;
  incidentCount: number;
}

function utcDayStart(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/** Aggregate merged health segments into per-UTC-day buckets over [start, end]. */
export function rollupServiceDailyHealth({
  segments,
  incidents,
  start,
  end,
}: {
  segments: HealthSegment[];
  incidents: PublicHistoryIncident[];
  start: Date;
  end: Date;
}): ServiceDailyHealth[] {
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (endMs <= startMs) return [];
  const records: ServiceDailyHealth[] = [];

  for (let day = utcDayStart(startMs); day < endMs; day += DAY_MS) {
    const dayStart = Math.max(startMs, day);
    const dayEnd = Math.min(endMs, day + DAY_MS);
    const measured = dayEnd - dayStart;
    if (measured <= 0) continue;

    let degradedMs = 0;
    let maintenanceMs = 0;
    let partialOutageMs = 0;
    let majorOutageMs = 0;
    for (const segment of segments) {
      const from = Math.max(dayStart, segment.start);
      const to = Math.min(dayEnd, segment.end);
      if (to <= from) continue;
      const span = to - from;
      switch (segment.status) {
        case 'DEGRADED':
          degradedMs += span;
          break;
        case 'MAINTENANCE':
          maintenanceMs += span;
          break;
        case 'PARTIAL_OUTAGE':
          partialOutageMs += span;
          break;
        case 'MAJOR_OUTAGE':
          majorOutageMs += span;
          break;
        default:
          break;
      }
    }
    const nonOperational = degradedMs + maintenanceMs + partialOutageMs + majorOutageMs;

    let incidentCount = 0;
    for (const incident of incidents) {
      if (incident.status === 'SUPPRESSED' || incident.status === 'SNOOZED') continue;
      const from = incident.createdAt.getTime();
      const to = (incident.resolvedAt ?? end).getTime();
      if (from < dayEnd && to > dayStart) incidentCount += 1;
    }

    records.push({
      date: new Date(day).toISOString().slice(0, 10),
      operationalMs: Math.max(0, measured - nonOperational),
      degradedMs,
      maintenanceMs,
      partialOutageMs,
      majorOutageMs,
      unknownMs: 0,
      incidentCount,
    });
  }
  return records;
}

/**
 * Availability from daily rollups, using the same policy as the live engine: maintenance is
 * available, degraded/partial/major are downtime. Equals `serviceUptimePercent` over the same days.
 */
export function uptimeFromDailyHealth(records: ServiceDailyHealth[]): number {
  let measured = 0;
  let down = 0;
  for (const record of records) {
    measured +=
      record.operationalMs +
      record.degradedMs +
      record.maintenanceMs +
      record.partialOutageMs +
      record.majorOutageMs +
      record.unknownMs;
    down += record.degradedMs + record.partialOutageMs + record.majorOutageMs;
  }
  if (measured <= 0) return 100;
  return Math.max(0, Math.min(100, ((measured - down) / measured) * 100));
}
