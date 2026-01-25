'use client';

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

type NotificationStreamHandlers<T = any> = {
  enabled?: boolean;
  onNotifications?: (notifications: T[]) => void;
  onUnreadCount?: (count: number) => void;
  onError?: (error: Error) => void;
};

export function useNotificationStream<T = any>({
  enabled = true,
  onNotifications,
  onUnreadCount,
  onError,
}: NotificationStreamHandlers<T>) {
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef({ onNotifications, onUnreadCount, onError });

  useEffect(() => {
    handlersRef.current = { onNotifications, onUnreadCount, onError };
  }, [onNotifications, onUnreadCount, onError]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof EventSource === 'undefined') {
      handlersRef.current.onError?.(new Error('EventSource not supported'));
      return;
    }

    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notifications' && Array.isArray(data.notifications)) {
          handlersRef.current.onNotifications?.(data.notifications);
        }
        if (data.type === 'unread_count') {
          handlersRef.current.onUnreadCount?.(data.count || 0);
        }
      } catch (error) {
        logger.error('useNotificationStream.parse', {
          component: 'useNotificationStream',
          error,
        });
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      const error = new Error('Notification stream connection error');
      handlersRef.current.onError?.(error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [enabled]);

  return { isConnected };
}
