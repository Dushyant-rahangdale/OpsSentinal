import { describe, expect, it } from 'vitest';
import {
  defaultNotificationPolicy,
  incidentNotificationPriority,
  notificationAgingFloor,
  statusNotificationPriority,
} from '@/lib/notification-priority';

describe('notification priority policy', () => {
  it('places critical responders ahead of public and bulk traffic', () => {
    expect(
      incidentNotificationPriority({ eventType: 'triggered', priority: 'P1', urgency: 'HIGH' })
    ).toEqual({ trafficClass: 'CRITICAL', priority: 0 });
    expect(statusNotificationPriority('triggered')).toEqual({
      trafficClass: 'PUBLIC_INCIDENT',
      priority: 4,
    });
    expect(statusNotificationPriority('created')).toEqual({
      trafficClass: 'PUBLIC_INCIDENT',
      priority: 4,
    });
    expect(statusNotificationPriority('resolved')).toEqual({
      trafficClass: 'BULK',
      priority: 6,
    });
  });

  it('gives non-trigger lifecycle notifications transactional precedence', () => {
    expect(incidentNotificationPriority({ eventType: 'resolved', urgency: 'HIGH' })).toEqual({
      trafficClass: 'TRANSACTIONAL',
      priority: 2,
    });
  });

  it('defaults status-page callers to public or bulk classes', () => {
    expect(defaultNotificationPolicy('STATUS_PAGE', 'status-page-incident-monitoring')).toEqual({
      trafficClass: 'PUBLIC_INCIDENT',
      priority: 5,
    });
    expect(defaultNotificationPolicy('STATUS_PAGE', 'status-page-announcement')).toEqual({
      trafficClass: 'BULK',
      priority: 8,
    });
  });

  it('prevents public and bulk aging from reaching critical precedence', () => {
    expect(notificationAgingFloor('PUBLIC_INCIDENT')).toBe(3);
    expect(notificationAgingFloor('BULK')).toBe(5);
  });
});
