/** Bounds shared by public readers. Workspace retention may shorten these windows further. */
export function statusPagePublicationLimits(settings: {
  maxIncidentsToShow?: number | null;
  incidentHistoryDays?: number | null;
  dataRetentionDays?: number | null;
}) {
  const bounded = (value: number | null | undefined, fallback: number, maximum: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(1, Math.min(maximum, Math.floor(value)))
      : fallback;
  const historyDays = bounded(settings.incidentHistoryDays, 90, 365);
  return {
    maxIncidents: bounded(settings.maxIncidentsToShow, 50, 100),
    historyDays: Math.min(historyDays, bounded(settings.dataRetentionDays, historyDays, 365)),
  };
}
