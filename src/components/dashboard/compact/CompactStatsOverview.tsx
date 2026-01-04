'use client';

import { memo, useMemo } from 'react';

interface CompactStatsOverviewProps {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  unassignedIncidents: number;
  servicesCount: number;
}

/**
 * Safely formats a number for display
 */
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0';
  }
  return Math.max(0, Math.round(value)).toLocaleString();
}

/**
 * Compact Stats Overview Widget
 * Displays key incident statistics in a compact format
 */
const CompactStatsOverview = memo(function CompactStatsOverview({
  openIncidents,
  criticalIncidents,
  unassignedIncidents,
  servicesCount,
}: CompactStatsOverviewProps) {
  const stats = useMemo(
    () => [
      {
        label: 'Open',
        value: formatNumber(openIncidents),
        color: 'var(--color-info)',
        description: 'Open incidents',
      },
      {
        label: 'Critical',
        value: formatNumber(criticalIncidents),
        color: criticalIncidents > 0 ? 'var(--color-error)' : 'var(--text-muted)',
        description: 'Critical priority incidents',
      },
      {
        label: 'Unassigned',
        value: formatNumber(unassignedIncidents),
        color: unassignedIncidents > 0 ? 'var(--color-warning)' : 'var(--text-muted)',
        description: 'Unassigned incidents',
      },
      {
        label: 'Services',
        value: formatNumber(servicesCount),
        color: 'var(--text-primary)',
        description: 'Total services',
      },
    ],
    [openIncidents, criticalIncidents, unassignedIncidents, servicesCount]
  );

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      role="list"
      aria-label="Stats overview"
    >
      {stats.map((stat, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-neutral-50)',
            border: '1px solid var(--border)',
          }}
          role="listitem"
          aria-label={`${stat.description}: ${stat.value}`}
        >
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-secondary)',
            }}
          >
            {stat.label}
          </span>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 'var(--font-weight-bold)',
              color: stat.color,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
});

export default CompactStatsOverview;
