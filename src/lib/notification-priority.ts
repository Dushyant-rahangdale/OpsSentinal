import type { NotificationCategory, NotificationTrafficClass } from '@prisma/client';

/** Server-owned delivery precedence. Lower values run first. */
export const NOTIFICATION_PRIORITY = {
  RESPONDER_CRITICAL: 0,
  RESPONDER: 1,
  INTERNAL_LIFECYCLE: 2,
  OPERATIONAL_INTEGRATION: 3,
  STATUS_INCIDENT: 4,
  STATUS_UPDATE: 5,
  STATUS_RESOLVED: 6,
  STATUS_INCIDENT_ANNOUNCEMENT: 7,
  STATUS_ANNOUNCEMENT: 8,
  BEST_EFFORT: 9,
} as const;

export const NOTIFICATION_AGING_FLOOR: Record<NotificationTrafficClass, number> = {
  CRITICAL: 0,
  TRANSACTIONAL: 1,
  PUBLIC_INCIDENT: 3,
  BULK: 5,
};

export function notificationAgingFloor(trafficClass: NotificationTrafficClass): number {
  switch (trafficClass) {
    case 'CRITICAL':
      return NOTIFICATION_AGING_FLOOR.CRITICAL;
    case 'TRANSACTIONAL':
      return NOTIFICATION_AGING_FLOOR.TRANSACTIONAL;
    case 'PUBLIC_INCIDENT':
      return NOTIFICATION_AGING_FLOOR.PUBLIC_INCIDENT;
    case 'BULK':
      return NOTIFICATION_AGING_FLOOR.BULK;
  }
}

export function incidentNotificationPriority(input: {
  eventType: string;
  priority?: string | null;
  urgency?: string | null;
}) {
  if (input.eventType !== 'triggered') {
    return {
      trafficClass: 'TRANSACTIONAL' as const,
      priority: NOTIFICATION_PRIORITY.INTERNAL_LIFECYCLE,
    };
  }
  return {
    trafficClass: 'CRITICAL' as const,
    priority:
      input.priority === 'P1' || input.priority === 'P2' || input.urgency === 'HIGH'
        ? NOTIFICATION_PRIORITY.RESPONDER_CRITICAL
        : NOTIFICATION_PRIORITY.RESPONDER,
  };
}

export function statusNotificationPriority(eventType: string) {
  if (eventType === 'created') eventType = 'triggered';
  if (eventType === 'updated') eventType = 'update';
  if (['resolved', 'completed'].includes(eventType)) {
    return { trafficClass: 'BULK' as const, priority: NOTIFICATION_PRIORITY.STATUS_RESOLVED };
  }
  if (['scheduled', 'inprogress'].includes(eventType)) {
    return { trafficClass: 'BULK' as const, priority: NOTIFICATION_PRIORITY.STATUS_ANNOUNCEMENT };
  }
  return {
    trafficClass: 'PUBLIC_INCIDENT' as const,
    priority:
      eventType === 'triggered'
        ? NOTIFICATION_PRIORITY.STATUS_INCIDENT
        : NOTIFICATION_PRIORITY.STATUS_UPDATE,
  };
}

/** Conservative defaults for trusted callers that do not supply a policy. */
export function defaultNotificationPolicy(category: NotificationCategory, templateKey: string) {
  if (category === 'STATUS_PAGE') {
    if (templateKey.startsWith('status-page-incident-')) {
      return statusNotificationPriority(templateKey.slice('status-page-incident-'.length));
    }
    return { trafficClass: 'BULK' as const, priority: NOTIFICATION_PRIORITY.STATUS_ANNOUNCEMENT };
  }
  if (category === 'INCIDENT') {
    return incidentNotificationPriority({
      eventType: templateKey === 'incident-triggered' ? 'triggered' : 'updated',
    });
  }
  return {
    trafficClass: 'TRANSACTIONAL' as const,
    priority:
      category === 'SYSTEM'
        ? NOTIFICATION_PRIORITY.BEST_EFFORT
        : NOTIFICATION_PRIORITY.OPERATIONAL_INTEGRATION,
  };
}
