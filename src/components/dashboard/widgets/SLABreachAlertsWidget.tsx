'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import SidebarWidget, {
  WIDGET_ICON_BG,
  WIDGET_ICON_COLOR,
} from '@/components/dashboard/SidebarWidget';
import { useWidgetData } from '@/components/dashboard/WidgetProvider';

interface SLAAlert {
  incident: {
    id: string;
    title: string;
    serviceName: string;
    slaAckDeadline: Date | null;
    slaResolveDeadline: Date | null;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
  };
  alertType: 'ack' | 'resolve' | null;
  timeRemaining: number;
  severity: 'critical' | 'warning';
}

/**
 * Formats milliseconds as a human-readable countdown
 */
function formatTimeRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Safely parses a date value
 */
function safeParseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * SLA Breach Alerts Widget
 * Shows incidents approaching SLA breach with live countdown timer
 */
const SLABreachAlertsWidget = memo(function SLABreachAlertsWidget() {
  const widgetData = useWidgetData();
  const router = useRouter();

  // Live tick state - updates every second for countdown
  const [tick, setTick] = useState(0);

  // Update tick every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate alerts with current time (recalculates on each tick for live countdown)
  const sortedAlerts = useMemo(() => {
    const currentTime = new Date();

    const alerts: SLAAlert[] = (widgetData.slaBreachAlerts || [])
      .map(incident => {
        let alertType: 'ack' | 'resolve' | null = null;
        let timeRemaining = 0;
        let severity: 'critical' | 'warning' = 'warning';

        const ackDeadline = safeParseDate(incident.slaAckDeadline);
        const resolveDeadline = safeParseDate(incident.slaResolveDeadline);
        const acknowledgedAt = safeParseDate(incident.acknowledgedAt);
        const resolvedAt = safeParseDate(incident.resolvedAt);

        if (ackDeadline && !acknowledgedAt) {
          timeRemaining = Math.max(0, ackDeadline.getTime() - currentTime.getTime());
          alertType = 'ack';
          // Critical if <= 5 minutes remaining
          if (timeRemaining <= 5 * 60000) severity = 'critical';
        } else if (resolveDeadline && !resolvedAt) {
          timeRemaining = Math.max(0, resolveDeadline.getTime() - currentTime.getTime());
          alertType = 'resolve';
          // Critical if <= 10 minutes remaining
          if (timeRemaining <= 10 * 60000) severity = 'critical';
        }

        return {
          incident: {
            id: incident.id,
            title: incident.title,
            serviceName: incident.serviceName,
            slaAckDeadline: ackDeadline,
            slaResolveDeadline: resolveDeadline,
            acknowledgedAt,
            resolvedAt,
          },
          alertType,
          timeRemaining,
          severity,
        };
      })
      .filter(alert => alert.alertType !== null && alert.timeRemaining > 0);

    // Sort by time remaining (most urgent first)
    alerts.sort((a, b) => a.timeRemaining - b.timeRemaining);

    return alerts;
    // tick is intentionally included to trigger recalculation every second for live countdown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetData.slaBreachAlerts, tick]);

  const handleIncidentClick = useCallback(
    (incidentId: string) => {
      router.push(`/incidents/${incidentId}`);
    },
    [router]
  );

  const handleViewAll = useCallback(() => {
    router.push('/incidents?status=OPEN');
  }, [router]);

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
          aria-hidden="true"
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
          onClick: handleViewAll,
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
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          role="list"
          aria-label="SLA breach alerts"
        >
          {sortedAlerts.map(({ incident, alertType, timeRemaining, severity }) => {
            const isUrgent = severity === 'critical';
            const bgColor = isUrgent ? 'rgba(190, 18, 60, 0.05)' : 'rgba(217, 119, 6, 0.05)';
            const borderColor = isUrgent ? 'rgba(190, 18, 60, 0.2)' : 'rgba(217, 119, 6, 0.2)';
            const accentColor = isUrgent ? '#be123c' : '#d97706';
            const timeStr = formatTimeRemaining(timeRemaining);
            const actionLabel = alertType === 'ack' ? 'ACK' : 'RESOLVE';

            return (
              <button
                key={incident.id}
                onClick={() => handleIncidentClick(incident.id)}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                role="listitem"
                aria-label={`${incident.title} - ${actionLabel} deadline in ${timeStr}`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  {/* Icon */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: isUrgent ? 'rgba(190, 18, 60, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={accentColor}
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
                          maxWidth: '100px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={incident.serviceName}
                      >
                        {incident.serviceName}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} aria-hidden="true">
                        •
                      </span>
                      <span
                        style={{
                          color: accentColor,
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                        aria-live="polite"
                      >
                        {actionLabel} in {timeStr}
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
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </SidebarWidget>
  );
});

export default SLABreachAlertsWidget;
