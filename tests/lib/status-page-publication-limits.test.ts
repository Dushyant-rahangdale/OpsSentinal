import { describe, expect, it } from 'vitest';
import { statusPagePublicationLimits } from '@/lib/status-pages/publication-policy';

describe('status page publication limits', () => {
  it('honors page count and history settings', () => {
    expect(statusPagePublicationLimits({ maxIncidentsToShow: 5, incidentHistoryDays: 7 })).toEqual({
      maxIncidents: 5,
      historyDays: 7,
    });
  });
  it('applies the stricter retention boundary', () => {
    expect(
      statusPagePublicationLimits({ incidentHistoryDays: 90, dataRetentionDays: 14 }).historyDays
    ).toBe(14);
  });
  it('bounds malformed persisted values', () => {
    expect(
      statusPagePublicationLimits({ maxIncidentsToShow: Infinity, incidentHistoryDays: -3 })
    ).toEqual({ maxIncidents: 50, historyDays: 1 });
  });
});
