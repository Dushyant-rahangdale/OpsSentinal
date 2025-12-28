'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, FormField } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

interface ActionItem {
    id: string;
    title: string;
    description: string;
    owner?: string;
    dueDate?: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    postmortemId: string;
    postmortemTitle: string;
    incidentId: string;
    incidentTitle: string;
    serviceName: string;
    createdAt: Date;
}

interface ActionItemsBoardProps {
    actionItems: ActionItem[];
    users: Array<{ id: string; name: string; email: string }>;
    canManage: boolean;
    view: 'board' | 'list';
    filters: {
        status?: string;
        owner?: string;
        priority?: string;
    };
}

const STATUS_COLORS = {
    OPEN: '#3b82f6',
    IN_PROGRESS: '#f59e0b',
    COMPLETED: '#22c55e',
    BLOCKED: '#ef4444',
};

const STATUS_LABELS = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    BLOCKED: 'Blocked',
};

const PRIORITY_COLORS = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#6b7280',
};

const PRIORITY_LABELS = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
};

export default function ActionItemsBoard({ actionItems, users, canManage, view, filters }: ActionItemsBoardProps) {
    const { userTimeZone } = useTimezone();
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [selectedOwner, setSelectedOwner] = useState(filters.owner || '');
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || '');

    const buildFilterUrl = (updates: { status?: string; owner?: string; priority?: string }) => {
        const params = new URLSearchParams();
        if (updates.status) params.set('status', updates.status);
        if (updates.owner) params.set('owner', updates.owner);
        if (updates.priority) params.set('priority', updates.priority);
        if (view) params.set('view', view);
        return `/action-items?${params.toString()}`;
    };

    // Group items by status for board view
    const groupedByStatus = {
        OPEN: actionItems.filter(item => item.status === 'OPEN'),
        IN_PROGRESS: actionItems.filter(item => item.status === 'IN_PROGRESS'),
        COMPLETED: actionItems.filter(item => item.status === 'COMPLETED'),
        BLOCKED: actionItems.filter(item => item.status === 'BLOCKED'),
    };

    const getOwnerName = (ownerId?: string) => {
        if (!ownerId) return 'Unassigned';
        const user = users.find(u => u.id === ownerId);
        return user?.name || 'Unknown';
    };

    const isOverdue = (item: ActionItem) => {
        if (!item.dueDate || item.status === 'COMPLETED') return false;
        return new Date(item.dueDate) < new Date();
    };

    if (view === 'board') {
        return (
            <div>
                {/* Filters */}
                <div className="glass-panel" style={{
                    padding: 'var(--spacing-5)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-xl)',
                    marginBottom: 'var(--spacing-6)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-3)' }}>
                        <FormField
                            type="select"
                            label="Status"
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                window.location.href = buildFilterUrl({ status: e.target.value || undefined, owner: selectedOwner || undefined, priority: selectedPriority || undefined });
                            }}
                            options={[
                                { value: '', label: 'All Statuses' },
                                { value: 'OPEN', label: 'Open' },
                                { value: 'IN_PROGRESS', label: 'In Progress' },
                                { value: 'COMPLETED', label: 'Completed' },
                                { value: 'BLOCKED', label: 'Blocked' },
                            ]}
                        />
                        <FormField
                            type="select"
                            label="Owner"
                            value={selectedOwner}
                            onChange={(e) => {
                                setSelectedOwner(e.target.value);
                                window.location.href = buildFilterUrl({ status: selectedStatus || undefined, owner: e.target.value || undefined, priority: selectedPriority || undefined });
                            }}
                            options={[
                                { value: '', label: 'All Owners' },
                                ...users.map(user => ({ value: user.id, label: user.name })),
                            ]}
                        />
                        <FormField
                            type="select"
                            label="Priority"
                            value={selectedPriority}
                            onChange={(e) => {
                                setSelectedPriority(e.target.value);
                                window.location.href = buildFilterUrl({ status: selectedStatus || undefined, owner: selectedOwner || undefined, priority: e.target.value || undefined });
                            }}
                            options={[
                                { value: '', label: 'All Priorities' },
                                { value: 'HIGH', label: 'High' },
                                { value: 'MEDIUM', label: 'Medium' },
                                { value: 'LOW', label: 'Low' },
                            ]}
                        />
                    </div>
                </div>

                {/* Kanban Board */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-5)' }}>
                    {Object.entries(groupedByStatus).map(([status, items]) => (
                        <div key={status} className="glass-panel" style={{
                            padding: 'var(--spacing-5)',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: `2px solid ${STATUS_COLORS[status as keyof typeof STATUS_COLORS]}40`,
                            borderRadius: 'var(--radius-xl)',
                            minHeight: '500px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        }}>
                            <div style={{ 
                                marginBottom: 'var(--spacing-5)',
                                paddingBottom: 'var(--spacing-4)',
                                borderBottom: `2px solid ${STATUS_COLORS[status as keyof typeof STATUS_COLORS]}20`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
                                    <h3 style={{ 
                                        fontSize: 'var(--font-size-lg)', 
                                        fontWeight: '700',
                                        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-2)',
                                    }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
                                            boxShadow: `0 0 8px ${STATUS_COLORS[status as keyof typeof STATUS_COLORS]}60`,
                                        }} />
                                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                                    </h3>
                                    <Badge
                                        variant={status === 'COMPLETED' ? 'success' : status === 'BLOCKED' ? 'error' : 'default'}
                                        style={{
                                            background: `${STATUS_COLORS[status as keyof typeof STATUS_COLORS]}20`,
                                            color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
                                            fontWeight: '700',
                                        }}
                                    >
                                        {items.length}
                                    </Badge>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                {items.length === 0 ? (
                                    <div style={{ 
                                        padding: 'var(--spacing-4)', 
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        fontSize: 'var(--font-size-sm)',
                                    }}>
                                        No items
                                    </div>
                                ) : (
                                    items.map((item) => {
                                        const overdue = isOverdue(item);
                                        return (
                                            <div
                                                key={item.id}
                                                style={{
                                                    padding: 'var(--spacing-4)',
                                                    background: 'white',
                                                    border: `2px solid ${STATUS_COLORS[item.status]}40`,
                                                    borderRadius: 'var(--radius-md)',
                                                    borderLeft: `4px solid ${STATUS_COLORS[item.status]}`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                                onClick={() => window.location.href = `/postmortems/${item.incidentId}`}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-1)' }}>
                                                            <span style={{
                                                                padding: '0.25rem 0.5rem',
                                                                borderRadius: 'var(--radius-sm)',
                                                                fontSize: 'var(--font-size-xs)',
                                                                fontWeight: '600',
                                                                background: `${PRIORITY_COLORS[item.priority]}20`,
                                                                color: PRIORITY_COLORS[item.priority],
                                                            }}>
                                                                {PRIORITY_LABELS[item.priority]}
                                                            </span>
                                                            {overdue && (
                                                                <span style={{
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    fontSize: 'var(--font-size-xs)',
                                                                    fontWeight: '600',
                                                                    background: '#ef444420',
                                                                    color: '#ef4444',
                                                                }}>
                                                                    Overdue
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', marginBottom: 'var(--spacing-1)' }}>
                                                            {item.title}
                                                        </h4>
                                                        {item.description && (
                                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-2)' }}>
                                                                {item.description.substring(0, 100)}
                                                                {item.description.length > 100 ? '...' : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ 
                                                    paddingTop: 'var(--spacing-2)',
                                                    borderTop: '1px solid #e2e8f0',
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--text-muted)',
                                                }}>
                                                    <div style={{ marginBottom: 'var(--spacing-1)' }}>
                                                        👤 {getOwnerName(item.owner)}
                                                    </div>
                                                    {item.dueDate && (
                                                        <div style={{ marginBottom: 'var(--spacing-1)' }}>
                                                            📅 {formatDateTime(item.dueDate, userTimeZone, { format: 'date' })}
                                                        </div>
                                                    )}
                                                    <div>
                                                        📋 <Link href={`/postmortems/${item.incidentId}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                                            {item.postmortemTitle}
                                                        </Link>
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', marginTop: 'var(--spacing-1)' }}>
                                                        Incident: {item.incidentTitle}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // List view
    return (
        <div>
            {/* Filters - same as board view */}
            <div className="glass-panel" style={{
                padding: 'var(--spacing-4)',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--spacing-4)',
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-3)' }}>
                    <FormField
                        type="select"
                        label="Status"
                        value={selectedStatus}
                        onChange={(e) => {
                            setSelectedStatus(e.target.value);
                            window.location.href = buildFilterUrl({ status: e.target.value || undefined, owner: selectedOwner || undefined, priority: selectedPriority || undefined });
                        }}
                        options={[
                            { value: '', label: 'All Statuses' },
                            { value: 'OPEN', label: 'Open' },
                            { value: 'IN_PROGRESS', label: 'In Progress' },
                            { value: 'COMPLETED', label: 'Completed' },
                            { value: 'BLOCKED', label: 'Blocked' },
                        ]}
                    />
                    <FormField
                        type="select"
                        label="Owner"
                        value={selectedOwner}
                        onChange={(e) => {
                            setSelectedOwner(e.target.value);
                            window.location.href = buildFilterUrl({ status: selectedStatus || undefined, owner: e.target.value || undefined, priority: selectedPriority || undefined });
                        }}
                        options={[
                            { value: '', label: 'All Owners' },
                            ...users.map(user => ({ value: user.id, label: user.name })),
                        ]}
                    />
                    <FormField
                        type="select"
                        label="Priority"
                        value={selectedPriority}
                        onChange={(e) => {
                            setSelectedPriority(e.target.value);
                            window.location.href = buildFilterUrl({ status: selectedStatus || undefined, owner: selectedOwner || undefined, priority: e.target.value || undefined });
                        }}
                        options={[
                            { value: '', label: 'All Priorities' },
                            { value: 'HIGH', label: 'High' },
                            { value: 'MEDIUM', label: 'Medium' },
                            { value: 'LOW', label: 'Low' },
                        ]}
                    />
                </div>
            </div>

            {/* List View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {actionItems.length === 0 ? (
                    <div className="glass-panel" style={{
                        padding: 'var(--spacing-8)',
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-lg)',
                    }}>
                        <p style={{ color: 'var(--text-muted)' }}>No action items found matching the filters.</p>
                    </div>
                ) : (
                    actionItems.map((item) => {
                        const overdue = isOverdue(item);
                        return (
                            <div
                                key={item.id}
                                className="glass-panel"
                                style={{
                                    padding: 'var(--spacing-5)',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                    border: `2px solid ${STATUS_COLORS[item.status]}40`,
                                    borderRadius: 'var(--radius-lg)',
                                    borderLeft: `4px solid ${STATUS_COLORS[item.status]}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateX(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                                onClick={() => window.location.href = `/postmortems/${item.incidentId}`}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-3)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
                                            <Badge
                                                variant={item.status === 'COMPLETED' ? 'success' : item.status === 'BLOCKED' ? 'error' : 'default'}
                                            >
                                                {STATUS_LABELS[item.status]}
                                            </Badge>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: '600',
                                                background: `${PRIORITY_COLORS[item.priority]}20`,
                                                color: PRIORITY_COLORS[item.priority],
                                            }}>
                                                {PRIORITY_LABELS[item.priority]} Priority
                                            </span>
                                            {overdue && (
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: '600',
                                                    background: '#ef444420',
                                                    color: '#ef4444',
                                                }}>
                                                    Overdue
                                                </span>
                                            )}
                                        </div>
                                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--spacing-1)' }}>
                                            {item.title}
                                        </h3>
                                        {item.description && (
                                            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-2)' }}>
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div style={{ 
                                    display: 'flex',
                                    gap: 'var(--spacing-4)',
                                    paddingTop: 'var(--spacing-3)',
                                    borderTop: '1px solid #e2e8f0',
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--text-muted)',
                                    flexWrap: 'wrap',
                                }}>
                                    <span>👤 {getOwnerName(item.owner)}</span>
                                    {item.dueDate && (
                                        <span>📅 Due: {formatDateTime(item.dueDate, userTimeZone, { format: 'date' })}</span>
                                    )}
                                    <span>📋 <Link href={`/postmortems/${item.incidentId}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                        {item.postmortemTitle}
                                    </Link></span>
                                    <span>🔗 <Link href={`/incidents/${item.incidentId}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                        {item.incidentTitle}
                                    </Link></span>
                                    <span>🏷️ {item.serviceName}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
