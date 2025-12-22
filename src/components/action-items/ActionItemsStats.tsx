'use client';

import Link from 'next/link';

interface ActionItemsStatsProps {
    stats: {
        total: number;
        open: number;
        inProgress: number;
        completed: number;
        blocked: number;
        overdue: number;
        highPriority: number;
    };
}

export default function ActionItemsStats({ stats }: ActionItemsStatsProps) {
    const statCards = [
        {
            label: 'Total',
            value: stats.total,
            color: '#6b7280',
            href: '/action-items',
        },
        {
            label: 'Open',
            value: stats.open,
            color: '#3b82f6',
            href: '/action-items?status=OPEN',
        },
        {
            label: 'In Progress',
            value: stats.inProgress,
            color: '#f59e0b',
            href: '/action-items?status=IN_PROGRESS',
        },
        {
            label: 'Completed',
            value: stats.completed,
            color: '#22c55e',
            href: '/action-items?status=COMPLETED',
        },
        {
            label: 'Blocked',
            value: stats.blocked,
            color: '#ef4444',
            href: '/action-items?status=BLOCKED',
        },
        {
            label: 'Overdue',
            value: stats.overdue,
            color: '#dc2626',
            href: '/action-items?status=OPEN',
            highlight: stats.overdue > 0,
        },
        {
            label: 'High Priority',
            value: stats.highPriority,
            color: '#ef4444',
            href: '/action-items?priority=HIGH',
            highlight: stats.highPriority > 0,
        },
    ];

    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-6)',
        }}>
            {statCards.map((stat) => (
                <Link
                    key={stat.label}
                    href={stat.href}
                    style={{
                        textDecoration: 'none',
                        color: 'inherit',
                    }}
                >
                    <div
                        className="glass-panel"
                        style={{
                            padding: 'var(--spacing-4)',
                            background: stat.highlight
                                ? `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}05 100%)`
                                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: `1px solid ${stat.highlight ? stat.color + '40' : '#e2e8f0'}`,
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: stat.highlight ? `0 4px 16px ${stat.color}20` : '0 4px 16px rgba(0,0,0,0.06)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}30`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = stat.highlight ? `0 4px 16px ${stat.color}20` : '0 4px 16px rgba(0,0,0,0.06)';
                        }}
                    >
                        <div style={{ 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--spacing-1)',
                        }}>
                            {stat.label}
                        </div>
                        <div style={{ 
                            fontSize: 'var(--font-size-2xl)', 
                            fontWeight: '700',
                            color: stat.color,
                        }}>
                            {stat.value}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}

