import MobileCard from '@/components/mobile/MobileCard';

export const dynamic = 'force-dynamic';

export default async function MobileAnalyticsPage() {
  const { calculateSLAMetrics } = await import('@/lib/sla-server');
  const slaMetrics = await calculateSLAMetrics({
    windowDays: 7,
    includeAllTime: false,
  });

  const dayMs = 24 * 60 * 60 * 1000;
  const effectiveWindowDays = Math.max(
    1,
    Math.ceil((slaMetrics.effectiveEnd.getTime() - slaMetrics.effectiveStart.getTime()) / dayMs)
  );
  const windowLabelDays = slaMetrics.isClipped ? effectiveWindowDays : 7;
  const windowLabelSuffix = slaMetrics.isClipped ? ' (retention limit)' : '';

  const openIncidents = slaMetrics.activeIncidents;
  const incidentsInRange = slaMetrics.totalIncidents;
  const mtta = (slaMetrics.mttd || 0) * 60000; // Convert minutes to ms for formatDuration
  const mttr = (slaMetrics.mttr || 0) * 60000; // Convert minutes to ms for formatDuration

  const formatDuration = (ms: number) => {
    if (ms === 0) return '--';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = (mins / 60).toFixed(1);
    return `${hours}h`;
  };

  return (
    <div className="mobile-dashboard">
      <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Analytics</h1>

      <div className="mobile-metrics-grid">
        <MobileCard className="mobile-metric-card">
          <div className="mobile-metric-value">{openIncidents}</div>
          <div className="mobile-metric-label">Open Incidents</div>
        </MobileCard>
        <MobileCard className="mobile-metric-card">
          <div className="mobile-metric-value">{incidentsInRange}</div>
          <div className="mobile-metric-label">
            New ({windowLabelDays}d){windowLabelSuffix}
          </div>
        </MobileCard>
        <MobileCard className="mobile-metric-card">
          <div className="mobile-metric-value">{formatDuration(mtta)}</div>
          <div className="mobile-metric-label">
            MTTA ({windowLabelDays}d){windowLabelSuffix}
          </div>
        </MobileCard>
        <MobileCard className="mobile-metric-card">
          <div className="mobile-metric-value">{formatDuration(mttr)}</div>
          <div className="mobile-metric-label">
            MTTR ({windowLabelDays}d){windowLabelSuffix}
          </div>
        </MobileCard>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '0 0.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Metrics are calculated based on the last {windowLabelDays} days of activity.
          {slaMetrics.isClipped ? ' Data is limited by retention settings.' : ''} For detailed
          reports and custom ranges, please use the desktop dashboard.
        </p>
      </div>
    </div>
  );
}
