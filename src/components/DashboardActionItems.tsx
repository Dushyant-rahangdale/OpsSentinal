'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui';

interface DashboardActionItemsProps {
    stats: {
        total: number;
        open: number;
        inProgress: number;
        completed: number;
        overdue: number;
        highPriority: number;
    };
    recentItems?: Array<{
        id: string;
        title: string;
        status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        dueDate?: string;
        owner?: string;
        incidentId: string;
    }>;
}

const STATUS_COLORS = {
    OPEN: '#3b82f6',
    IN_PROGRESS: '#f59e0b',
    COMPLETED: '#22c55e',
    BLOCKED: '#ef4444',
};

const PRIORITY_COLORS = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#6b7280',
};

export default function DashboardActionItems({ stats, recentItems = [] }: DashboardActionItemsProps) {
    const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return (
        <div className="glass-panel" style={{
            padding: 'var(--spacing-5)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700', marginBottom: 'var(--spacing-1)' }}>
                        Action Items
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                        Track postmortem follow-ups
                    </p>
                </div>
                <Link href="/action-items">
                    <Badge variant="default">
                        {stats.total} Total
                    </Badge>
                </Link>
            </div>

            {/* Stats Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-4)',
            }}>
                <Link href="/action-items?status=OPEN" style={{ textDecoration: 'none' }}>
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: '#3b82f6' }}>
                            {stats.open}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            Open
                        </div>
                    </div>
                </Link>
                <Link href="/action-items?status=IN_PROGRESS" style={{ textDecoration: 'none' }}>
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: '#f59e0b' }}>
                            {stats.inProgress}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            In Progress
                        </div>
                    </div>
                </Link>
                <Link href="/action-items?status=COMPLETED" style={{ textDecoration: 'none' }}>
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: '#22c55e' }}>
                            {stats.completed}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            Completed
                        </div>
                    </div>
                </Link>
                <Link href="/action-items?status=OPEN" style={{ textDecoration: 'none' }}>
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: stats.overdue > 0 ? '#ef444415' : 'white',
                        border: `1px solid ${stats.overdue > 0 ? '#ef4444' : '#e2e8f0'}`,
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: stats.overdue > 0 ? '#ef4444' : '#6b7280' }}>
                            {stats.overdue}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            Overdue
                        </div>
                    </div>
                </Link>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 'var(--spacing-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                        Completion Rate
                    </span>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {completionRate.toFixed(0)}%
                    </span>
                </div>
                <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${completionRate}%`,
                        height: '100%',
                        background: completionRate === 100 ? '#22c55e' : '#3b82f6',
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            </div>

            {/* Recent Items */}
            {recentItems.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
                            Recent Items
                        </h4>
                        <Link href="/action-items" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary)', textDecoration: 'none' }}>
                            View All →
                        </Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                        {recentItems.slice(0, 5).map((item) => {
                            const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'COMPLETED';
                            return (
                                <Link
                                    key={item.id}
                                    href={`/postmortems/${item.incidentId}`}
                                    style={{
                                        padding: 'var(--spacing-2) var(--spacing-3)',
                                        background: 'white',
                                        border: `1px solid ${STATUS_COLORS[item.status]}40`,
                                        borderRadius: 'var(--radius-sm)',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: 'var(--font-size-sm)',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                        e.currentTarget.style.borderColor = STATUS_COLORS[item.status];
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateX(0)';
                                        e.currentTarget.style.borderColor = `${STATUS_COLORS[item.status]}40`;
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ 
                                            fontWeight: '600', 
                                            color: 'var(--text-primary)',
                                            marginBottom: 'var(--spacing-1)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {item.title}
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                            <span style={{
                                                padding: '0.125rem 0.5rem',
                                                borderRadius: 'var(--radius-sm)',
                                                background: `${PRIORITY_COLORS[item.priority]}20`,
                                                color: PRIORITY_COLORS[item.priority],
                                                fontWeight: '600',
                                            }}>
                                                {item.priority}
                                            </span>
                                            {isOverdue && (
                                                <span style={{ color: '#ef4444', fontWeight: '600' }}>
                                                    Overdue
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: STATUS_COLORS[item.status],
                                        flexShrink: 0,
                                    }} />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CTA */}
            <div style={{ marginTop: 'var(--spacing-4)', paddingTop: 'var(--spacing-4)', borderTop: '1px solid #e2e8f0' }}>
                <Link
                    href="/action-items"
                    style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: 'var(--spacing-2)',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--primary-hover)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--primary)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    View All Action Items
                </Link>
            </div>
        </div>
    );
}

