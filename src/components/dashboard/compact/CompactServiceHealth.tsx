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
        style={{
          padding: '1.25rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}
        role="status"
        aria-label="All services operational"
      >
        All services operational
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      role="list"
      aria-label="Service health status"
    >
      {displayServices.map(service => {
        const statusColor = getStatusColor(service.status);
        const statusLabel = getStatusLabel(service.status);
        const incidentCount = Math.max(0, service.activeIncidents);

        return (
          <div
            key={service.id}
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
            aria-label={`${service.name}: ${statusLabel}${incidentCount > 0 ? `, ${incidentCount} active incidents` : ''}`}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: statusColor,
                  flexShrink: 0,
                }}
                aria-hidden="true"
                title={statusLabel}
              />
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={service.name}
              >
                {service.name}
              </span>
            </div>
            {incidentCount > 0 && (
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-error)',
                  padding: '0.125rem 0.375rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
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
