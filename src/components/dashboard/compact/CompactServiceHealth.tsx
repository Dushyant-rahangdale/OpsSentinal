'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Compact Service Health Widget
 * Displays service status with incident counts
 */

interface ServiceHealthItem {
  id: string;
  name: string;
  status: string;
  activeIncidents: number;
}

interface CompactServiceHealthProps {
  services: ServiceHealthItem[];
}

/**
 * Gets the status indicator color class based on service status
 */
function getStatusClass(status: string | null | undefined): string {
  switch (status) {
    case 'OPERATIONAL':
      return 'bg-emerald-500 shadow-[0_0_6px_-1px_rgba(16,185,129,0.5)]';
    case 'DEGRADED':
      return 'bg-amber-500 shadow-[0_0_6px_-1px_rgba(245,158,11,0.5)]';
    case 'PARTIAL_OUTAGE':
    case 'MAJOR_OUTAGE':
    case 'CRITICAL':
      return 'bg-red-500 shadow-[0_0_6px_-1px_rgba(239,68,68,0.5)]';
    case 'MAINTENANCE':
      return 'bg-blue-500 shadow-[0_0_6px_-1px_rgba(59,130,246,0.5)]';
    default:
      return 'bg-muted-foreground';
  }
}

/**
 * Gets human-readable status label
 */
function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'OPERATIONAL':
      return 'Operational';
    case 'DEGRADED':
      return 'Degraded';
    case 'PARTIAL_OUTAGE':
      return 'Partial Outage';
    case 'MAJOR_OUTAGE':
      return 'Major Outage';
    case 'CRITICAL':
      return 'Critical';
    case 'MAINTENANCE':
      return 'Maintenance';
    default:
      return 'Unknown';
  }
}

/**
 * CompactServiceHealth Component
 * Shows top 5 services sorted by incident count
 */
const CompactServiceHealth = memo(function CompactServiceHealth({
  services,
}: CompactServiceHealthProps) {
  // Validate and sort services
  const displayServices = useMemo(() => {
    if (!Array.isArray(services)) return [];

    return services
      .filter(
        s =>
          s &&
          typeof s === 'object' &&
          s.id &&
          s.name &&
          typeof s.activeIncidents === 'number' &&
          Number.isFinite(s.activeIncidents)
      )
      .sort((a, b) => b.activeIncidents - a.activeIncidents)
      .slice(0, 5);
  }, [services]);

  if (displayServices.length === 0) {
    return (
      <div
        className="p-5 text-center text-muted-foreground text-sm"
        role="status"
        aria-label="All services operational"
      >
        All services operational
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Service health status">
      <div className="text-[11px] text-muted-foreground italic mb-1">
        Active counts exclude snoozed/suppressed.
      </div>
      {displayServices.map(service => {
        const statusClass = getStatusClass(service.status);
        const statusLabel = getStatusLabel(service.status);
        const incidentCount = Math.max(0, service.activeIncidents);

        return (
          <div
            key={service.id}
            className="flex items-center justify-between p-2 px-3 rounded-md bg-muted/40 border border-border"
            role="listitem"
            aria-label={`${service.name}: ${statusLabel}${incidentCount > 0 ? `, ${incidentCount} active incidents` : ''}`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div
                className={cn("w-2 h-2 rounded-full shrink-0", statusClass)}
                aria-hidden="true"
                title={statusLabel}
              />
              <span
                className="text-sm font-medium text-foreground overflow-hidden overflow-ellipsis whitespace-nowrap"
                title={service.name}
              >
                {service.name}
              </span>
            </div>
            {incidentCount > 0 && (
              <span
                className="text-xs font-bold text-red-600 dark:text-red-400 py-0.5 px-2 rounded-full bg-red-100 dark:bg-red-900/30 shrink-0 tabular-nums border border-red-200 dark:border-red-800"
                aria-label={`${incidentCount} active incidents`}
              >
                {incidentCount}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default CompactServiceHealth;
