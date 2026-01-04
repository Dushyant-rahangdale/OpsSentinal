'use client';

/**
 * Compact Service Health - Subtle Design
 */
export default function CompactServiceHealth({
  services,
}: {
  services: Array<{
    id: string;
    name: string;
    status: string;
    activeIncidents: number;
  }>;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'var(--color-success)';
      case 'DEGRADED':
        return 'var(--color-warning)';
      case 'PARTIAL_OUTAGE':
      case 'MAJOR_OUTAGE':
        return 'var(--color-error)';
      default:
        return 'var(--text-muted)';
    }
  };

  const displayServices = services
    .sort((a, b) => b.activeIncidents - a.activeIncidents)
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {displayServices.length === 0 ? (
        <div
          style={{
            padding: '1.25rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          All services operational
        </div>
      ) : (
        displayServices.map(service => (
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
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}
            >
              <div
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: getStatusColor(service.status),
                  flexShrink: 0,
                }}
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
              >
                {service.name}
              </span>
            </div>
            {service.activeIncidents > 0 && (
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-error)',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '999px',
                  background: 'var(--badge-error-bg)',
                  flexShrink: 0,
                }}
              >
                {service.activeIncidents}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
