'use client';

type Props = {
    tone: 'ok' | 'danger';
    label: string;
    detail: string;
};

export default function OperationalStatus({ tone, label, detail }: Props) {
    const isDanger = tone === 'danger';
    
    return (
        <div className="ops-status-clean">
            <div className="ops-status-label-clean">OPERATIONAL STATUS</div>
            <div className="ops-status-body-clean">
                <div className="ops-status-left-clean">
                    <div className={`ops-status-icon-clean ${tone}`}>
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
                    <span className={`ops-status-text-clean ${tone}`}>{label}</span>
                </div>
                <div className="ops-status-divider-clean"></div>
                <div className="ops-status-detail-clean">{detail}</div>
            </div>
        </div>
    );
}
