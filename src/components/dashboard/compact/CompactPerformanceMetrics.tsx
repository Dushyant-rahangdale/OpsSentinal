'use client';

/**
 * Compact Performance Metrics Widget - Subtle Design
 */
export default function CompactPerformanceMetrics({
  mtta,
  mttr,
  ackSlaRate,
  resolveSlaRate,
}: {
  mtta: number | null;
  mttr: number | null;
  ackSlaRate: number;
  resolveSlaRate: number;
}) {
  const formatTime = (minutes: number | null) => {
    if (minutes === null || minutes === undefined || isNaN(minutes)) return 'N/A';
    if (minutes < 1) return '<1m';

    const rounded = Math.round(minutes);
    if (rounded >= 60) {
      const hours = Math.floor(rounded / 60);
      const mins = rounded % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${rounded}m`;
  };

  const getStatusColor = (rate: number) => {
    if (isNaN(rate)) return 'var(--text-muted)';
    if (rate >= 95) return 'var(--color-success)';
    if (rate >= 80) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const formatPercent = (rate: number) => {
    if (isNaN(rate)) return 'N/A';
    return `${Math.round(rate)}%`;
  };

  const metrics = [
    { label: 'MTTA', value: formatTime(mtta), color: 'var(--text-primary)' },
    { label: 'MTTR', value: formatTime(mttr), color: 'var(--text-primary)' },
    { label: 'ACK SLA', value: formatPercent(ackSlaRate), color: getStatusColor(ackSlaRate) },
    {
      label: 'Resolve SLA',
      value: formatPercent(resolveSlaRate),
      color: getStatusColor(resolveSlaRate),
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          style={{
            padding: '0.625rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-neutral-50)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: '0.375rem',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {metric.label}
          </div>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 'var(--font-weight-bold)',
              color: metric.color,
              lineHeight: '1.3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}
