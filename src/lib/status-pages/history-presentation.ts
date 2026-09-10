import type {
  PublicHistorySlice,
  PublicServiceStatus,
  PublicStatusHistory,
  PublicStatusHistoryDay,
} from '@/lib/status-pages/public-contract';
import {
  addDaysToDateKey,
  formatDateKeyInTimeZone,
  startOfDayFromDateKey,
  startOfNextDayFromDateKey,
} from '@/lib/timezone';
import { getWorstPublicStatus } from './status-presentation';

function worstStatus(statuses: PublicServiceStatus[]): PublicServiceStatus {
  return getWorstPublicStatus(statuses);
}

export function buildPublicHistoryDays(
  history: PublicStatusHistory,
  timeZone: string
): PublicStatusHistoryDay[] {
  const rangeStart = new Date(history.rangeStart);
  const rangeEnd = new Date(history.rangeEnd);
  if (!Number.isFinite(rangeStart.getTime()) || !Number.isFinite(rangeEnd.getTime()) || rangeEnd <= rangeStart) {
    return [];
  }

  const days: PublicStatusHistoryDay[] = [];
  let date = formatDateKeyInTimeZone(rangeStart, timeZone);
  const lastDate = formatDateKeyInTimeZone(new Date(rangeEnd.getTime() - 1), timeZone);
  while (date <= lastDate) {
    const dayStart = startOfDayFromDateKey(date, timeZone);
    const dayEnd = startOfNextDayFromDateKey(date, timeZone);
    const measuredStart = Math.max(dayStart.getTime(), rangeStart.getTime());
    const measuredEnd = Math.min(dayEnd.getTime(), rangeEnd.getTime());
    const dayMinutes = Math.round((dayEnd.getTime() - dayStart.getTime()) / 60_000);
    const startMinute = Math.floor((measuredStart - dayStart.getTime()) / 60_000);
    const endMinute = Math.ceil((measuredEnd - dayStart.getTime()) / 60_000);
    const points = new Set([startMinute, endMinute]);
    const overlaps = history.segments.flatMap(segment => {
      const start = Math.max(measuredStart, new Date(segment.startAt).getTime());
      const end = Math.min(measuredEnd, new Date(segment.endAt).getTime());
      if (end <= start) return [];
      const slice = {
        startMinute: Math.max(0, Math.floor((start - dayStart.getTime()) / 60_000)),
        endMinute: Math.min(dayMinutes, Math.ceil((end - dayStart.getTime()) / 60_000)),
        status: segment.status,
      };
      points.add(slice.startMinute);
      points.add(slice.endMinute);
      return [slice];
    });
    const sorted = [...points].sort((left, right) => left - right);
    const timeline: PublicHistorySlice[] = [];
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const from = sorted.at(index);
      const to = sorted.at(index + 1);
      if (from === undefined || to === undefined || from >= to) continue;
      const covering = overlaps
        .filter(slice => slice.startMinute < to && slice.endMinute > from)
        .map(slice => slice.status);
      const status = covering.length > 0
        ? worstStatus(covering)
        : history.coverage === 'COMPLETE' ? 'OPERATIONAL' : 'UNKNOWN';
      const previous = timeline.at(-1);
      if (previous?.status === status) previous.endMinute = to;
      else timeline.push({ startMinute: from, endMinute: to, status });
    }
    const measuredMinutes = Math.max(1, endMinute - startMinute);
    const unavailableMinutes = timeline.reduce(
      (total, slice) =>
        total +
        (slice.status === 'DEGRADED' ||
        slice.status === 'PARTIAL_OUTAGE' ||
        slice.status === 'MAJOR_OUTAGE' ||
        slice.status === 'UNKNOWN'
          ? slice.endMinute - slice.startMinute
          : 0),
      0
    );
    days.push({
      date,
      status: worstStatus(timeline.map(slice => slice.status)),
      incidentCount: overlaps.filter(slice => slice.status !== 'MAINTENANCE').length,
      availabilityPercent:
        history.coverage === 'COMPLETE'
          ? Number((((measuredMinutes - unavailableMinutes) / measuredMinutes) * 100).toFixed(3))
          : null,
      timeline,
    });
    date = addDaysToDateKey(date, 1);
  }
  return days;
}
