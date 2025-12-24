'use client';

type PerformanceMetricsProps = {
  mtta: number | null; // in minutes
  mttr: number | null; // in minutes
  ackSlaRate: number; // percentage
  resolveSlaRate: number; // percentage
  mttaTrend?: 'up' | 'down' | 'neutral';
  mttrTrend?: 'up' | 'down' | 'neutral';
  previousMtta?: number | null;
  previousMttr?: number | null;
};

export default function DashboardPerformanceMetrics({
  mtta,
  mttr,
  ackSlaRate,
  resolveSlaRate,
  mttaTrend = 'neutral',
  mttrTrend = 'neutral',
  previousMtta,
  previousMttr
}: PerformanceMetricsProps) {
  const formatTime = (minutes: number | null) => {
    if (minutes === null || minutes === 0) return '--';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatTimeForDisplay = (minutes: number | null, color?: string) => {
    if (minutes === null || minutes === 0) return <span style={{ color }}>--</span>;
    if (minutes < 60) {
      return <span style={{ color }}>{Math.round(minutes)}m</span>;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
          <span style={{ color }}>{hours}h</span>
          <span style={{ color }}>{mins}m</span>
        </div>
      );
    }
    return <span style={{ color }}>{hours}h</span>;
  };

  const getTrendIndicator = (current: number | null, previous: number | null, trend?: 'up' | 'down' | 'neutral') => {
    if (!current || !previous) return null;
    const change = current - previous;
    const percentChange = Math.abs((change / previous) * 100);
    
    if (trend === 'up' || change > 0) {
      return { icon: '↑', color: '#ef5350', text: `+${formatTime(Math.abs(change))} (+${percentChange.toFixed(1)}%)` };
    } else if (trend === 'down' || change < 0) {
      return { icon: '↓', color: '#16a34a', text: `-${formatTime(Math.abs(change))} (-${percentChange.toFixed(1)}%)` };
    }
    return null;
  };

  const mttaTrendData = getTrendIndicator(mtta, previousMtta ?? null, mttaTrend);
  const mttrTrendData = getTrendIndicator(mttr, previousMttr ?? null, mttrTrend);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {/* MTTA */}
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>
              MTTA
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mean Time to Acknowledge</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#dc2626', marginBottom: '0.25rem' }}>
            {formatTime(mtta)}
          </div>
          {mttaTrendData && (
            <div style={{ fontSize: '0.7rem', color: mttaTrendData.color, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>{mttaTrendData.icon}</span>
              <span>{mttaTrendData.text}</span>
            </div>
          )}
        </div>

        {/* MTTR */}
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>
              MTTR
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mean Time to Resolve</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>
            {formatTimeForDisplay(mttr, '#16a34a')}
          </div>
          {mttrTrendData && (
            <div style={{ fontSize: '0.7rem', color: mttrTrendData.color, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>{mttrTrendData.icon}</span>
              <span>{mttrTrendData.text}</span>
            </div>
          )}
        </div>

        {/* Ack SLA */}
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: '600' }}>
            Acknowledge SLA
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: ackSlaRate >= 95 ? 'var(--success)' : ackSlaRate >= 80 ? '#ffa726' : 'var(--danger)', marginBottom: '0.2rem' }}>
            {ackSlaRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {ackSlaRate >= 95 ? 'Excellent' : ackSlaRate >= 80 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>

        {/* Resolve SLA */}
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: '600' }}>
            Resolve SLA
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: resolveSlaRate >= 95 ? 'var(--success)' : resolveSlaRate >= 80 ? '#ffa726' : 'var(--danger)', marginBottom: '0.2rem' }}>
            {resolveSlaRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {resolveSlaRate >= 95 ? 'Excellent' : resolveSlaRate >= 80 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>
      </div>
  );
}
