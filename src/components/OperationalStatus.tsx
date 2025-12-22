'use client';

type Props = {
    tone: 'ok' | 'danger';
    label: string;
    detail: string;
};

export default function OperationalStatus({ tone, label, detail }: Props) {
    const isDanger = tone === 'danger';
    
    return (
        <div className="ops-status-new">
            <div className={`ops-status-indicator ${tone}`}>
                <div className={`ops-status-pulse ${tone}`} />
                <div className="ops-status-dot">
                    {isDanger ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    )}
                </div>
            </div>
            <div className="ops-status-content">
                <div className="ops-status-header">
                    <span className="ops-status-label">System Status</span>
                    <span className={`ops-status-badge ${tone}`}>
                        {isDanger ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <polyline points="9 12 11 14 15 10"/>
                            </svg>
                        )}
                    </span>
                </div>
                <div className="ops-status-main">
                    <span className={`ops-status-value ${tone}`}>{label}</span>
                    <span className="ops-status-detail">{detail}</span>
                </div>
            </div>
        </div>
    );
}
