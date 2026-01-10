'use client';

import { memo, useMemo } from 'react';

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
 * Gets the status indicator color based on service status
 */
function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'OPERATIONAL':
      return 'var(--color-success)';
    case 'DEGRADED':
      return 'var(--color-warning)';
    case 'PARTIAL_OUTAGE':
    case 'MAJOR_OUTAGE':
    case 'CRITICAL':
      return 'var(--color-error)';
    case 'MAINTENANCE':
      return 'var(--color-info)';
    default:
      return 'var(--text-muted)';
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
      <div className="text-[11px] text-muted-foreground">
        Active counts exclude snoozed and suppressed incidents.
      </div>
      {displayServices.map(service => {
        const statusColor = getStatusColor(service.status);
        const statusLabel = getStatusLabel(service.status);
        const incidentCount = Math.max(0, service.activeIncidents);

        return (
          <div
            key={service.id}
            className="flex items-center justify-between p-2 px-3 rounded-sm bg-neutral-50 border border-border"
            role="listitem"
            aria-label={`${service.name}: ${statusLabel}${incidentCount > 0 ? `, ${incidentCount} active incidents` : ''}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: statusColor }}
                aria-hidden="true"
                title={statusLabel}
              />
              <span
                className="text-sm font-medium text-secondary-foreground overflow-hidden overflow-ellipsis whitespace-nowrap"
                title={service.name}
              >
                {service.name}
              </span>
            </div>
            {incidentCount > 0 && (
              <span
                className="text-xs font-semibold text-red-600 py-0.5 px-1.5 rounded-full bg-red-100 shrink-0 tabular-nums"
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
