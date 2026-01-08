'use client';

import Link from 'next/link';

type ServiceHealthData = {
  id: string;
  name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
  activeIncidents: number;
  criticalIncidents: number;
};

type DashboardServiceHealthProps = {
  services: ServiceHealthData[];
};

export default function DashboardServiceHealth({ services }: DashboardServiceHealthProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return { bg: '#dcfce7', text: '#16a34a', border: '#86efac' };
      case 'DEGRADED':
        return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
      case 'PARTIAL_OUTAGE':
        return { bg: '#fed7aa', text: '#ea580c', border: '#fdba74' };
      case 'MAJOR_OUTAGE':
        return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
      case 'MAINTENANCE':
        return { bg: '#e0e7ff', text: '#6366f1', border: '#a5b4fc' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return '🟢';
      case 'DEGRADED':
        return '🟡';
      case 'PARTIAL_OUTAGE':
        return '🟠';
      case 'MAJOR_OUTAGE':
        return '🔴';
      case 'MAINTENANCE':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const statusCounts = services.reduce(
    (acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sortedServices = [...services].sort((a, b) => {
    const statusOrder = [
      'MAJOR_OUTAGE',
      'PARTIAL_OUTAGE',
      'DEGRADED',
      'MAINTENANCE',
      'OPERATIONAL',
    ];
    const aIndex = statusOrder.indexOf(a.status);
    const bIndex = statusOrder.indexOf(b.status);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return b.activeIncidents - a.activeIncidents;
  });

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Link
          href="/services"
          className="dashboard-link-hover"
          style={{
            fontSize: '0.85rem',
            color: 'var(--primary-color)',
            textDecoration: 'none',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          View All <span>→</span>
        </Link>
      </div>

      {/* Status Summary */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {Object.entries(statusCounts).map(([status, count]) => {
          const colors = getStatusColor(status);
          return (
            <div
              key={status}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                fontSize: '0.75rem',
                fontWeight: '600',
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>{getStatusIcon(status)}</span>
              <span>{status.replace('_', ' ')}</span>
              <span style={{ opacity: 0.8 }}>({count})</span>
            </div>
          );
        })}
      </div>

      {/* Services List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sortedServices.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ opacity: 0.3, margin: '0 auto 0.5rem' }}
            >
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>No services found</p>
          </div>
        ) : (
          sortedServices.slice(0, 5).map(service => {
            const colors = getStatusColor(service.status);
            return (
              <Link
                key={service.id}
                href={`/services/${service.id}`}
                className="dashboard-service-health-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: colors.text,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '0.15rem',
                      }}
                    >
                      {service.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.text, fontWeight: '600' }}>
                      {service.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                {service.activeIncidents > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {service.criticalIncidents > 0 && (
                      <div
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                        }}
                      >
                        {service.criticalIncidents} Critical
                      </div>
                    )}
                    <div
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: '#f3f4f6',
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                      }}
                    >
                      {service.activeIncidents} Active
                    </div>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
