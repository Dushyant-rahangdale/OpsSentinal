'use client';

import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/timezone';
import { useTimezone } from '@/contexts/TimezoneContext';

type Notification = {
    id: string;
    channel: string;
    status: string;
    message: string | null;
    incident: {
        id: string;
        title: string;
        status: string;
        urgency: string;
    } | null;
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    errorMsg: string | null;
    createdAt: string;
};

export default function NotificationHistory() {
    const { userTimeZone } = useTimezone();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [limit] = useState(50);
    const [filterChannel, setFilterChannel] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });
            if (filterChannel) params.set('channel', filterChannel);
            if (filterStatus) params.set('status', filterStatus);

            const response = await fetch(`/api/notifications/history?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error('Error fetching notification history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [offset, filterChannel, filterStatus]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SENT':
                return '#22c55e';
            case 'PENDING':
                return '#f59e0b';
            case 'FAILED':
                return '#dc2626';
            default:
                return '#6b7280';
        }
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'EMAIL':
                return '📧';
            case 'SMS':
                return '📱';
            case 'PUSH':
                return '🔔';
            case 'SLACK':
                return '💬';
            case 'WEBHOOK':
                return '🔗';
            default:
                return '📬';
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <select
                    value={filterChannel}
                    onChange={(e) => {
                        setFilterChannel(e.target.value);
                        setOffset(0);
                    }}
                    style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'white'
                    }}
                >
                    <option value="">All Channels</option>
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="PUSH">Push</option>
                    <option value="SLACK">Slack</option>
                    <option value="WEBHOOK">Webhook</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setOffset(0);
                    }}
                    style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'white'
                    }}
                >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="SENT">Sent</option>
                    <option value="FAILED">Failed</option>
                </select>

                <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                    Total: {total} notifications
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading notification history...
                </div>
            ) : notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>No notifications found</p>
                </div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Channel</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Incident</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Created</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Sent</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifications.map((notification) => (
                                    <tr key={notification.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>
                                                {getChannelIcon(notification.channel)}
                                            </span>
                                            {notification.channel}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    background: `${getStatusColor(notification.status)}20`,
                                                    color: getStatusColor(notification.status)
                                                }}
                                            >
                                                {notification.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            {notification.incident ? (
                                                <a
                                                    href={`/incidents/${notification.incident.id}`}
                                                    style={{ color: 'var(--primary)', textDecoration: 'none' }}
                                                >
                                                    {notification.incident.title}
                                                </a>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {notification.createdAt}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {notification.sentAt || '-'}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
                                            {notification.errorMsg || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={() => setOffset(Math.max(0, offset - limit))}
                            disabled={offset === 0}
                            className="glass-button"
                            style={{ opacity: offset === 0 ? 0.5 : 1 }}
                        >
                            Previous
                        </button>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
                        </span>
                        <button
                            type="button"
                            onClick={() => setOffset(offset + limit)}
                            disabled={offset + limit >= total}
                            className="glass-button"
                            style={{ opacity: offset + limit >= total ? 0.5 : 1 }}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

