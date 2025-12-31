'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [limit] = useState(50);
    const [filterChannel, setFilterChannel] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [stats, setStats] = useState({
        total: 0,
        sent: 0,
        pending: 0,
        failed: 0
    });

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

                const allNotifications = data.notifications || [];
                const statsData = {
                    total: data.total || 0,
                    sent: allNotifications.filter((n: Notification) => n.status === 'SENT').length,
                    pending: allNotifications.filter((n: Notification) => n.status === 'PENDING').length,
                    failed: allNotifications.filter((n: Notification) => n.status === 'FAILED').length
                };
                setStats(statsData);
            }
        } catch (error) {
            if (error instanceof Error) {
                logger.error('Error fetching notification history', { error: error.message });
            } else {
                logger.error('Error fetching notification history', { error: String(error) });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [offset, filterChannel, filterStatus]);

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'SENT':
                return 'active';
            case 'PENDING':
                return 'pending';
            case 'FAILED':
                return 'revoked';
            default:
                return '';
        }
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'EMAIL':
                return 'E';
            case 'SMS':
                return 'S';
            case 'PUSH':
                return 'P';
            case 'SLACK':
                return '#';
            case 'WEBHOOK':
                return 'W';
            case 'WHATSAPP':
                return 'WA';
            default:
                return 'N';
        }
    };

    return (
        <div className="settings-history">
            <div className="settings-summary-grid">
                <div className="settings-summary-card">
                    <span>Total notifications</span>
                    <strong>{stats.total}</strong>
                    <small>All recent notifications.</small>
                </div>
                <div className="settings-summary-card success">
                    <span>Sent</span>
                    <strong>{stats.sent}</strong>
                    <small>Delivered successfully.</small>
                </div>
                <div className="settings-summary-card pending">
                    <span>Pending</span>
                    <strong>{stats.pending}</strong>
                    <small>Queued or processing.</small>
                </div>
                <div className="settings-summary-card danger">
                    <span>Failed</span>
                    <strong>{stats.failed}</strong>
                    <small>Delivery errors.</small>
                </div>
            </div>

            <div className="settings-table-card">
                <div className="settings-table-header">
                    <div className="settings-toolbar">
                        <button
                            type="button"
                            onClick={() => fetchNotifications()}
                            className="settings-link-button"
                            disabled={loading}
                        >
                            Refresh
                        </button>
                        <select
                            value={filterChannel}
                            onChange={(e) => {
                                setFilterChannel(e.target.value);
                                setOffset(0);
                            }}
                            className="settings-filter-select"
                        >
                            <option value="">All Channels</option>
                            <option value="EMAIL">Email</option>
                            <option value="SMS">SMS</option>
                            <option value="PUSH">Push</option>
                            <option value="SLACK">Slack</option>
                            <option value="WEBHOOK">Webhook</option>
                            <option value="WHATSAPP">WhatsApp</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => {
                                setFilterStatus(e.target.value);
                                setOffset(0);
                            }}
                            className="settings-filter-select"
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="SENT">Sent</option>
                            <option value="FAILED">Failed</option>
                        </select>

                        <div className="settings-toolbar-meta">
                            Total: {total} notifications
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="settings-empty-state-v2">
                        <div className="settings-empty-icon">o</div>
                        <h3>Loading history</h3>
                        <p>Fetching the latest delivery events.</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="settings-empty-state-v2">
                        <div className="settings-empty-icon">o</div>
                        <h3>No notifications found</h3>
                        <p>Try adjusting the filters or refresh the list.</p>
                    </div>
                ) : (
                    <>
                        <div className="settings-table-wrapper">
                            <table className="settings-table">
                                <thead>
                                    <tr>
                                        <th>Channel</th>
                                        <th>Status</th>
                                        <th>Incident</th>
                                        <th>Created</th>
                                        <th>Sent</th>
                                        <th>Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notifications.map((notification) => (
                                        <tr key={notification.id}>
                                            <td>
                                                <span className="settings-channel-pill">
                                                    <span aria-hidden="true">{getChannelIcon(notification.channel)}</span>
                                                    {notification.channel}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`settings-status ${getStatusClass(notification.status)}`}>
                                                    {notification.status}
                                                </span>
                                            </td>
                                            <td>
                                                {notification.incident ? (
                                                    <a className="settings-link-inline" href={`/incidents/${notification.incident.id}`}>
                                                        {notification.incident.title}
                                                    </a>
                                                ) : (
                                                    <span className="settings-muted">N/A</span>
                                                )}
                                            </td>
                                            <td className="settings-muted">
                                                {notification.createdAt}
                                            </td>
                                            <td className="settings-muted">
                                                {notification.sentAt || '-'}
                                            </td>
                                            <td className="settings-muted">
                                                {notification.errorMsg || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="settings-table-footer">
                            <button
                                type="button"
                                onClick={() => setOffset(Math.max(0, offset - limit))}
                                disabled={offset === 0}
                                className="settings-link-button"
                                style={{ opacity: offset === 0 ? 0.5 : 1 }}
                            >
                                Previous
                            </button>
                            <span className="settings-muted">
                                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
                            </span>
                            <button
                                type="button"
                                onClick={() => setOffset(offset + limit)}
                                disabled={offset + limit >= total}
                                className="settings-link-button"
                                style={{ opacity: offset + limit >= total ? 0.5 : 1 }}
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
