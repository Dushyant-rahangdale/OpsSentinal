'use client';

import { useRouter } from 'next/navigation';
import SidebarWidget, {
  WIDGET_ICON_BG,
  WIDGET_ICON_COLOR,
} from '@/components/dashboard/SidebarWidget';
import { useWidgetData } from '@/components/dashboard/WidgetProvider';

/**
 * SLA Breach Alerts Widget - Simple Clean Design
 */
export default function SLABreachAlertsWidget() {
  const widgetData = useWidgetData();
  const router = useRouter();
  const now = new Date();

  const alerts = widgetData.slaBreachAlerts.map(incident => {
    let alertType: 'ack' | 'resolve' | null = null;
    let timeRemaining = 0;
    let severity: 'critical' | 'warning' = 'warning';

    if (incident.slaAckDeadline && !incident.acknowledgedAt) {
      timeRemaining = Math.max(0, incident.slaAckDeadline.getTime() - now.getTime());
      alertType = 'ack';
      if (timeRemaining <= 5 * 60000) severity = 'critical';
    } else if (incident.slaResolveDeadline && !incident.resolvedAt) {
      timeRemaining = Math.max(0, incident.slaResolveDeadline.getTime() - now.getTime());
      alertType = 'resolve';
      if (timeRemaining <= 10 * 60000) severity = 'critical';
    }

    return {
      incident,
      alertType,
      timeRemaining,
      severity,
    };
  });

  const sortedAlerts = alerts.sort((a, b) => a.timeRemaining - b.timeRemaining);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <SidebarWidget
      title="SLA Breach Alerts"
      iconBg={WIDGET_ICON_BG.red}
      icon={
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={WIDGET_ICON_COLOR.red}
          strokeWidth="2.5"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeWidth="3" />
        </svg>
      }
      lastUpdated={widgetData.lastUpdated}
      actions={[
        {
          label: 'View All',
          onClick: () => router.push('/incidents?status=OPEN'),
        },
      ]}
    >
      {sortedAlerts.length === 0 ? (
        <div
          style={{
            padding: '2rem 1rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: 'rgba(5, 150, 105, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
            >
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p
            style={{
              fontSize: '0.95rem',
              fontWeight: '600',
              margin: '0 0 0.25rem 0',
              color: 'var(--text-primary)',
            }}
          >
            All Clear
          </p>
          <p
            style={{
              fontSize: '0.8rem',
              margin: 0,
              color: 'var(--text-muted)',
            }}
          >
            No SLA breaches imminent
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sortedAlerts.map(({ incident, alertType, timeRemaining, severity }) => (
            <div
              key={incident.id}
              onClick={() => router.push(`/incidents/${incident.id}`)}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                background:
                  severity === 'critical' ? 'rgba(190, 18, 60, 0.05)' : 'rgba(217, 119, 6, 0.05)',
                border: `1px solid ${severity === 'critical' ? 'rgba(190, 18, 60, 0.2)' : 'rgba(217, 119, 6, 0.2)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                {/* Icon */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background:
                      severity === 'critical' ? 'rgba(190, 18, 60, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={severity === 'critical' ? '#be123c' : '#d97706'}
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                    <line
                      x1="12"
                      y1="16"
                      x2="12.01"
                      y2="16"
                      strokeLinecap="round"
                      strokeWidth="3"
                    />
                  </svg>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title */}
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '0.5rem',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                    }}
                  >
                    {incident.title}
                  </div>

                  {/* Info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span
                      style={{
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        background: 'var(--color-neutral-100)',
                        color: 'var(--text-secondary)',
                        fontWeight: '500',
                        fontSize: '0.7rem',
                      }}
                    >
                      {incident.serviceName}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span
                      style={{
                        color: severity === 'critical' ? '#be123c' : '#d97706',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                      }}
                    >
                      {alertType === 'ack' ? 'ACK' : 'RESOLVE'} in{' '}
                      {formatTimeRemaining(timeRemaining)}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2"
                  style={{ flexShrink: 0, marginTop: '4px' }}
                >
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </SidebarWidget>
  );
}
