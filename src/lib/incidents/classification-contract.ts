import type { IncidentUrgency } from '@prisma/client';
import type { IncidentPriority } from './priority';

export const ALERT_SEVERITIES = ['critical', 'error', 'warning', 'info'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export type DefaultAlertClassification = {
  priority: IncidentPriority | null;
  urgency: IncidentUrgency;
};

/**
 * Compatibility contract for alert ingestion before a workspace policy is available.
 * Severity historically selected urgency only; priority remains an explicit business decision.
 */
export function defaultAlertClassification(severity: AlertSeverity): DefaultAlertClassification {
  switch (severity) {
    case 'critical':
      return { priority: null, urgency: 'HIGH' };
    case 'error':
      return { priority: null, urgency: 'MEDIUM' };
    case 'warning':
      return { priority: null, urgency: 'MEDIUM' };
    case 'info':
      return { priority: null, urgency: 'LOW' };
  }
}

export function priorityFromUrgency(urgency: IncidentUrgency): IncidentPriority {
  switch (urgency) {
    case 'HIGH':
      return 'P1';
    case 'MEDIUM':
      return 'P3';
    case 'LOW':
      return 'P5';
  }
}
