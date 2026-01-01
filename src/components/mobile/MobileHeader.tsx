'use client';

import Link from 'next/link';
import TopbarNotifications from '@/components/TopbarNotifications';

type MobileHeaderProps = {
    systemStatus?: 'ok' | 'warning' | 'danger';
};

export default function MobileHeader({ systemStatus = 'ok' }: MobileHeaderProps) {
    const statusColors = {
        ok: { bg: '#dcfce7', color: '#16a34a', label: 'All Systems Operational' },
        warning: { bg: '#fef3c7', color: '#d97706', label: 'Degraded Performance' },
        danger: { bg: '#fee2e2', color: '#dc2626', label: 'Critical Issues' },
    };

    const status = statusColors[systemStatus];

    return (
        <header className="mobile-header">
            <Link href="/m" className="mobile-header-logo">
                <img src="/logo.svg" alt="OpsSentinal" width={28} height={28} />
                <span className="mobile-header-title">OpsSentinal</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <TopbarNotifications />
                <div
                    className="mobile-header-status"
                    style={{ background: status.bg, color: status.color }}
                >
                    <span className="mobile-status-dot" style={{ background: status.color }} />
                    <span className="mobile-status-text">{status.label}</span>
                </div>
            </div>
        </header>
    );
}
