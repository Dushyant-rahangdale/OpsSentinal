'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useModalState } from '@/hooks/useModalState';
import { logger } from '@/lib/logger';

type Notification = {
    id: string;
    title: string;
    message: string;
    time: string;
    unread: boolean;
    type: 'incident' | 'service' | 'schedule';
    incidentId?: string;
    channel?: string;
    createdAt?: string;
};

export default function TopbarNotifications() {
    const [open, setOpen] = useModalState('notifications');
    const containerRef = useRef<HTMLDivElement>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/notifications?limit=50');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            } else {
                logger.error('Failed to fetch notifications', { component: 'TopbarNotifications', status: response.status });
            }
        } catch (error) {
            logger.error('Error fetching notifications', { component: 'TopbarNotifications', error });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        // Set up SSE connection for real-time updates
        const eventSource = new EventSource('/api/notifications/stream');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'notifications' && data.notifications) {
                    // Add new notifications to the list
                    setNotifications((prev) => {
                        const existingIds = new Set(prev.map(n => n.id));
                        const newNotifications = data.notifications.filter((n: Notification) => !existingIds.has(n.id));
                        return [...newNotifications, ...prev].slice(0, 50); // Keep latest 50
                    });
                }

                if (data.type === 'unread_count') {
                    setUnreadCount(data.count || 0);
                }
            } catch (error) {
                logger.error('Error parsing SSE message', { component: 'TopbarNotifications', error });
            }
        };

        eventSource.onerror = (error) => {
            logger.error('SSE connection error', { component: 'TopbarNotifications', error });
            // Fallback to polling if SSE fails
            const interval = setInterval(fetchNotifications, 30000);
            eventSource.close();
            return () => clearInterval(interval);
        };

        return () => {
            eventSource.close();
        };
    }, [fetchNotifications]);

    // Mark notifications as read when dropdown opens
    useEffect(() => {
        if (!open || unreadCount === 0) return;

        async function markAsRead() {
            try {
                const response = await fetch('/api/notifications', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markAllAsRead: true })
                });

                if (response.ok) {
                    setNotifications((prev) =>
                        prev.map((notification) =>
                            notification.unread
                                ? { ...notification, unread: false }
                                : notification
                        )
                    );
                    setUnreadCount(0);
                }
            } catch (error) {
                logger.error('Error marking notifications as read', { component: 'TopbarNotifications', error });
            }
        }

        const timer = setTimeout(markAsRead, 100);
        return () => clearTimeout(timer);
    }, [open, unreadCount]);

    useEffect(() => {
        if (!open) return;

        const handleClick = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(event.target as Node)) return;
            setOpen(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, setOpen]);

    return (
        <div className="topbar-notifications-container" ref={containerRef}>
            <button
                type="button"
                className={`topbar-notifications-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setOpen(!open)}
                aria-label="Notifications"
                aria-expanded={open}
            >
                <svg
                    className="topbar-notifications-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                >
                    <path
                        d="M12 4a6 6 0 0 0-6 6v3.2l-1.4 2.2a1 1 0 0 0 .8 1.6h13.2a1 1 0 0 0 .8-1.6L18 13.2V10a6 6 0 0 0-6-6Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M9.5 20a2.5 2.5 0 0 0 5 0"
                        strokeLinecap="round"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="topbar-notifications-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="topbar-notifications-dropdown">
                    <div className="topbar-notifications-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="topbar-notifications-unread-count">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <div className="topbar-notifications-list">
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <p>No notifications</p>
                                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`topbar-notification-item ${notification.unread ? 'unread' : ''}`}
                                    onClick={() => {
                                        if (notification.incidentId) {
                                            window.location.href = `/incidents/${notification.incidentId}`;
                                        }
                                    }}
                                    style={{ cursor: notification.incidentId ? 'pointer' : 'default' }}
                                >
                                    <div className="topbar-notification-icon">
                                        {notification.type === 'incident' && (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
                                            </svg>
                                        )}
                                        {notification.type === 'service' && (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
                                            </svg>
                                        )}
                                        {notification.type === 'schedule' && (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M7 3v3m10-3v3M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" strokeLinecap="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="topbar-notification-content">
                                        <div className="topbar-notification-title">{notification.title}</div>
                                        <div className="topbar-notification-message">{notification.message}</div>
                                        <div className="topbar-notification-time">{notification.time}</div>
                                    </div>
                                    {notification.unread && (
                                        <div className="topbar-notification-dot" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="topbar-notifications-footer">
                        {notifications.length > 0 && (
                            <button
                                type="button"
                                className="topbar-notifications-view-all"
                                onClick={async () => {
                                    if (unreadCount > 0) {
                                        try {
                                            await fetch('/api/notifications', {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ markAllAsRead: true })
                                            });
                                            setNotifications((prev) =>
                                                prev.map((notification) =>
                                                    notification.unread
                                                        ? { ...notification, unread: false }
                                                        : notification
                                                )
                                            );
                                            setUnreadCount(0);
                                        } catch (error) {
                                            logger.error('Error marking all as read', { component: 'TopbarNotifications', error });
                                        }
                                    }
                                    await fetchNotifications();
                                }}
                            >
                                {unreadCount > 0 ? 'Mark all as read' : 'Refresh notifications'}
                            </button>
                        )}
                        <button
                            type="button"
                            className="topbar-notifications-view-all"
                            onClick={() => {
                                setOpen(false);
                                window.location.href = '/settings/notifications/history';
                            }}
                            style={{ marginTop: notifications.length > 0 ? '0.5rem' : '0' }}
                        >
                            📊 View Notification Status
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
