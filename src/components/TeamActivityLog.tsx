'use client';

import Link from 'next/link';

type AuditLog = {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: Date;
    actor: {
        name: string;
        email: string;
    } | null;
    details: any;
};

type TeamActivityLogProps = {
    teamId: string;
    logs: AuditLog[];
    totalLogs: number;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

export default function TeamActivityLog({ teamId, logs, totalLogs, currentPage, totalPages, onPageChange }: TeamActivityLogProps) {
    const formatAction = (action: string) => {
        return action
            .replace(/\./g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const getActionColor = (action: string) => {
        if (action.includes('created')) return { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' };
        if (action.includes('deleted') || action.includes('removed')) return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
        if (action.includes('updated') || action.includes('role')) return { bg: '#fef3c7', color: '#78350f', border: '#fde68a' };
        return { bg: '#e0f2fe', color: '#0c4a6e', border: '#bae6fd' };
    };

    return (
        <div className="glass-panel" style={{ 
            padding: '1.5rem', 
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                        Team Activity
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Recent changes to this team ({totalLogs} total)
                    </p>
                </div>
                <Link
                    href={`/audit?entityType=TEAM&entityId=${teamId}`}
                    style={{
                        fontSize: '0.85rem',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontWeight: '500'
                    }}
                >
                    View All →
                </Link>
            </div>

            {logs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.9rem' }}>No activity recorded yet.</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                        {logs.map((log) => {
                            const actionStyle = getActionColor(log.action);
                            return (
                                <div
                                    key={log.id}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        background: '#f8fafc',
                                        border: `1px solid ${actionStyle.border}`,
                                        borderRadius: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '1rem'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <span
                                                style={{
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600',
                                                    background: actionStyle.bg,
                                                    color: actionStyle.color,
                                                    border: `1px solid ${actionStyle.border}`
                                                }}
                                            >
                                                {formatAction(log.action)}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {new Date(log.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            by <strong>{log.actor?.name || 'System'}</strong>
                                            {log.details && typeof log.details === 'object' && (
                                                <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                                                    {Object.entries(log.details).map(([key, value]) => (
                                                        <span key={key} style={{ marginLeft: '0.5rem' }}>
                                                            {key}: <strong>{String(value)}</strong>
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <button
                                type="button"
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="glass-button"
                                style={{
                                    opacity: currentPage === 1 ? 0.5 : 1,
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    padding: '0.4rem 0.75rem',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Previous
                            </button>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="glass-button"
                                style={{
                                    opacity: currentPage === totalPages ? 0.5 : 1,
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    padding: '0.4rem 0.75rem',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

