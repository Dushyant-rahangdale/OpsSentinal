'use client';

import { memo, useMemo } from 'react';

interface CompactPerformanceMetricsProps {
  mtta: number | null;
  mttr: number | null;
  ackSlaRate: number | null;
  resolveSlaRate: number | null;
}

/**
 * Safely formats a time value in minutes to a human-readable string
 */
function formatTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return 'N/A';
  if (!Number.isFinite(minutes) || minutes < 0) return 'N/A';
  if (minutes < 1) return '<1m';

  const rounded = Math.round(minutes);
  if (rounded >= 60) {
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${rounded}m`;
}

/**
 * Gets the status color based on SLA compliance rate
 */
function getStatusColor(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) {
    return 'var(--text-muted)';
  }
  if (rate >= 95) return 'var(--color-success)';
  if (rate >= 80) return 'var(--color-warning)';
  return 'var(--color-error)';
}

/**
 * Safely formats a percentage value
 */
function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) {
    return 'N/A';
  }
  // Clamp to 0-100 range
  const clamped = Math.max(0, Math.min(100, rate));
  return `${Math.round(clamped)}%`;
}

/**
 * Compact Performance Metrics Widget
 * Displays MTTA, MTTR, and SLA compliance rates
 */
const CompactPerformanceMetrics = memo(function CompactPerformanceMetrics({
  mtta,
  mttr,
  ackSlaRate,
  resolveSlaRate,
}: CompactPerformanceMetricsProps) {
  const metrics = useMemo(
    () => [
      {
        label: 'MTTA',
        value: formatTime(mtta),
        color: 'var(--text-primary)',
        description: 'Mean Time to Acknowledge',
      },
      {
        label: 'MTTR',
        value: formatTime(mttr),
        color: 'var(--text-primary)',
        description: 'Mean Time to Resolve',
      },
      {
        label: 'ACK SLA',
        value: formatPercent(ackSlaRate),
        color: getStatusColor(ackSlaRate),
        description: 'Acknowledgment SLA Compliance',
      },
      {
        label: 'Resolve SLA',
        value: formatPercent(resolveSlaRate),
        color: getStatusColor(resolveSlaRate),
        description: 'Resolution SLA Compliance',
      },
    ],
    [mtta, mttr, ackSlaRate, resolveSlaRate]
  );

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}
      role="list"
      aria-label="Performance metrics"
    >
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
          role="listitem"
          aria-label={`${metric.description}: ${metric.value}`}
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
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
});

export default CompactPerformanceMetrics;
