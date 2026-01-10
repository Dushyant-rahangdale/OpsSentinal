'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import SidebarWidget, { WIDGET_ICON_BG } from '@/components/dashboard/SidebarWidget';
import { useWidgetData } from '@/components/dashboard/WidgetProvider';
import { Badge } from '@/components/ui/shadcn/badge';
import { AlertTriangle, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

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
 * SLA Breach Alerts Widget - Minimal Design
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
      title="SLA Alerts"
      iconBg={WIDGET_ICON_BG.red}
      icon={<AlertTriangle className="w-4 h-4" />}
      lastUpdated={widgetData.lastUpdated}
      actions={[
        {
          label: 'View All',
          onClick: handleViewAll,
        },
      ]}
    >
      {sortedAlerts.length === 0 ? (
        <div className="py-6 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xs font-semibold text-slate-700 mb-0.5">All Clear</p>
          <p className="text-[10px] text-slate-400">No SLA breaches imminent</p>
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label="SLA breach alerts">
          {sortedAlerts.slice(0, 3).map(({ incident, alertType, timeRemaining, severity }) => {
            const isUrgent = severity === 'critical';
            const actionLabel = alertType === 'ack' ? 'ACK' : 'RESOLVE';
            const timeStr = formatTimeRemaining(timeRemaining);

            return (
              <button
                key={incident.id}
                onClick={() => handleIncidentClick(incident.id)}
                className={cn(
                  "group flex items-center gap-3 p-2.5 rounded-lg border text-left w-full transition-colors",
                  isUrgent
                    ? "bg-rose-50/50 border-rose-200 hover:border-rose-300"
                    : "bg-amber-50/50 border-amber-200 hover:border-amber-300"
                )}
                role="listitem"
                aria-label={`${incident.title} - ${actionLabel} deadline in ${timeStr}`}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    isUrgent
                      ? "bg-rose-100 text-rose-600"
                      : "bg-amber-100 text-amber-600"
                  )}
                  aria-hidden="true"
                >
                  <Zap className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700 truncate mb-0.5">
                    {incident.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-400 truncate max-w-[80px]">{incident.serviceName}</span>
                    <span className="text-slate-300">•</span>
                    <span className={cn(
                      "font-bold tabular-nums",
                      isUrgent ? "text-rose-600" : "text-amber-600"
                    )}>
                      {actionLabel} {timeStr}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </SidebarWidget>
  );
});

export default SLABreachAlertsWidget;
