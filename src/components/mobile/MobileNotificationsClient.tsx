'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileCard from '@/components/mobile/MobileCard';
import { Skeleton } from '@/components/mobile/SkeletonLoader';
import { MobileEmptyIcon, MobileEmptyState } from '@/components/mobile/MobileUtils';
import { MobileFilterChip } from '@/components/mobile/MobileSearch';
import { logger } from '@/lib/logger';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'incident' | 'service' | 'schedule';
  incidentId: string | null;
  createdAt: string;
};

type NotificationResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
};

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
];

const typeLabelMap = new Map<NotificationItem['type'], string>([
  ['incident', 'Incident'],
  ['service', 'Service'],
  ['schedule', 'Schedule'],
]);

const typeActionMap = new Map<NotificationItem['type'], string>([
  ['incident', 'Open'],
  ['service', 'Services'],
  ['schedule', 'Schedules'],
]);

const getTypeLabel = (type: NotificationItem['type']) => typeLabelMap.get(type) ?? 'Notification';
const getTypeAction = (type: NotificationItem['type']) => typeActionMap.get(type) ?? 'Open';

const formatDayLabel = (date: Date) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });

  return formatter.format(date);
};

const resolveNotificationHref = (notification: NotificationItem) => {
  if (notification.incidentId) {
    return `/m/incidents/${notification.incidentId}`;
  }
  if (notification.type === 'service') {
    return '/m/services';
  }
  if (notification.type === 'schedule') {
    return '/m/schedules';
  }
  return '/m';
};

const NotificationSkeleton = () => (
  <MobileCard className="mobile-notification-card mobile-notifications-skeleton">
    <div className="mobile-notification-main">
      <div className="mobile-notification-icon tone-service">
        <Skeleton width="18px" height="18px" borderRadius="6px" />
      </div>
      <div className="mobile-notification-body">
        <div className="mobile-notification-title-row">
          <Skeleton width="60%" height="14px" borderRadius="4px" />
          <Skeleton width="12px" height="12px" borderRadius="999px" />
        </div>
        <Skeleton width="90%" height="12px" borderRadius="4px" />
        <div className="mobile-notification-meta">
          <Skeleton width="80px" height="10px" borderRadius="4px" />
          <Skeleton width="40px" height="10px" borderRadius="4px" />
        </div>
      </div>
    </div>
    <div className="mobile-notification-actions">
      <Skeleton width="70px" height="24px" borderRadius="999px" />
      <Skeleton width="70px" height="24px" borderRadius="999px" />
    </div>
  </MobileCard>
);

export default function MobileNotificationsClient() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/notifications?unreadOnly=${activeFilter === 'unread'}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = (await response.json()) as NotificationResponse;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      logger.error('mobile.notifications.fetch_failed', {
        component: 'MobileNotificationsClient',
        error,
      });
      setErrorMessage('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (isUpdating || unreadCount === 0) return;
    setIsUpdating(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }
      setNotifications(prev =>
        activeFilter === 'unread' ? [] : prev.map(item => ({ ...item, unread: false }))
      );
      setUnreadCount(0);
    } catch (error) {
      logger.error('mobile.notifications.mark_all_failed', {
        component: 'MobileNotificationsClient',
        error,
      });
      setErrorMessage('Unable to mark all as read.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }
      setNotifications(prev => {
        if (activeFilter === 'unread') {
          return prev.filter(item => item.id !== notificationId);
        }
        return prev.map(item => (item.id === notificationId ? { ...item, unread: false } : item));
      });
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('mobile.notifications.mark_failed', {
        component: 'MobileNotificationsClient',
        error,
      });
      setErrorMessage('Unable to update notification.');
    } finally {
      setIsUpdating(false);
    }
  };

  const emptyMessage = useMemo(() => {
    if (activeFilter === 'unread') {
      return 'You are all caught up.';
    }
    return 'No notifications yet.';
  }, [activeFilter]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>();

    notifications.forEach(notification => {
      const parsedDate = new Date(notification.createdAt);
      const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      const label = formatDayLabel(safeDate);
      const bucket = groups.get(label) ?? [];
      if (!groups.has(label)) {
        groups.set(label, bucket);
      }
      bucket.push(notification);
    });

    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [notifications]);

  return (
    <div className="mobile-notifications-page">
      <div className="mobile-notifications-header">
        <div>
          <h1 className="mobile-notifications-title">Notifications</h1>
          <p className="mobile-notifications-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <button
          type="button"
          className="mobile-notifications-action"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || isUpdating}
        >
          Mark all read
        </button>
      </div>

      <div className="mobile-notifications-filters">
        {filters.map(filter => (
          <MobileFilterChip
            key={filter.value}
            label={filter.label}
            active={activeFilter === filter.value}
            onClick={() => setActiveFilter(filter.value as 'all' | 'unread')}
          />
        ))}
      </div>

      {errorMessage && <div className="mobile-notifications-error">{errorMessage}</div>}

      {loading ? (
        <div className="mobile-notifications-skeleton-list" data-testid="notifications-skeleton">
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </div>
      ) : notifications.length === 0 ? (
        <MobileEmptyState
          icon={<MobileEmptyIcon />}
          title={emptyMessage}
          description="Incident updates and alerts show up here."
          action={
            <>
              <button
                type="button"
                className="mobile-empty-action primary"
                onClick={() => router.push('/m/incidents')}
              >
                View incidents
              </button>
              <button
                type="button"
                className="mobile-empty-action"
                onClick={() => router.push('/m/services')}
              >
                Check services
              </button>
            </>
          }
        />
      ) : (
        <div className="mobile-notifications-list">
          {groupedNotifications.map(group => (
            <div key={group.label} className="mobile-notifications-group">
              <div className="mobile-notifications-group-title">{group.label}</div>
              {group.items.map(notification => {
                const href = resolveNotificationHref(notification);
                const typeLabel = getTypeLabel(notification.type);
                const typeAction = getTypeAction(notification.type);
                return (
                  <MobileCard
                    key={notification.id}
                    className={`mobile-notification-card${notification.unread ? ' unread' : ''}`}
                    onClick={href ? () => router.push(href) : undefined}
                  >
                    <div className="mobile-notification-main">
                      <div className={`mobile-notification-icon tone-${notification.type}`}>
                        <span>{typeLabel.charAt(0)}</span>
                      </div>
                      <div className="mobile-notification-body">
                        <div className="mobile-notification-title-row">
                          <span className="mobile-notification-title">{notification.title}</span>
                          {notification.unread && <span className="mobile-notification-dot" />}
                        </div>
                        <p className="mobile-notification-message">{notification.message}</p>
                        <div className="mobile-notification-meta">
                          <span>{typeLabel}</span>
                          <span>-</span>
                          <span>{notification.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mobile-notification-actions">
                      {href && (
                        <button
                          type="button"
                          className="mobile-notification-link"
                          onClick={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            router.push(href);
                          }}
                        >
                          {typeAction}
                        </button>
                      )}
                      {notification.unread && (
                        <button
                          type="button"
                          className="mobile-notification-mark"
                          onClick={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleMarkRead(notification.id);
                          }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </MobileCard>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
