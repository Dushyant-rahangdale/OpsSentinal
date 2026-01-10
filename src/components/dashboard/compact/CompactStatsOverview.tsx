'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

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
        className: 'text-blue-600 dark:text-blue-400',
        description: 'Open incidents',
      },
      {
        label: 'Critical',
        value: formatNumber(criticalIncidents),
        className: criticalIncidents > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
        description: 'Critical priority incidents',
      },
      {
        label: 'Unassigned',
        value: formatNumber(unassignedIncidents),
        className: unassignedIncidents > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        description: 'Unassigned incidents',
      },
      {
        label: 'Services',
        value: formatNumber(servicesCount),
        className: 'text-foreground',
        description: 'Total services',
      },
    ],
    [openIncidents, criticalIncidents, unassignedIncidents, servicesCount]
  );

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Stats overview">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2 px-3 rounded-md bg-muted/40 border border-border"
          role="listitem"
          aria-label={`${stat.description}: ${stat.value}`}
        >
          <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
          <span className={cn('text-base font-bold tabular-nums', stat.className)}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
});

export default CompactStatsOverview;
