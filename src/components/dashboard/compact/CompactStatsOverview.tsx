'use client';

/**
 * Compact Stats Overview - Subtle Design
 */
export default function CompactStatsOverview({
  totalIncidents,
  openIncidents,
  resolvedIncidents,
  criticalIncidents,
  unassignedIncidents,
  servicesCount,
}: {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  unassignedIncidents: number;
  servicesCount: number;
}) {
  const stats = [
    { label: 'Open', value: openIncidents, color: 'var(--color-info)' },
    { label: 'Critical', value: criticalIncidents, color: 'var(--color-error)' },
    { label: 'Unassigned', value: unassignedIncidents, color: 'var(--color-warning)' },
    { label: 'Services', value: servicesCount, color: 'var(--text-primary)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            }}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
