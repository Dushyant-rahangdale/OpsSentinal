'use client';

import { usePathname } from 'next/navigation';
import SettingsNav from '@/components/settings/SettingsNav';

type Props = {
    isAdmin: boolean;
    children: React.ReactNode;
};

export default function SettingsLayoutShell({ isAdmin, children }: Props) {
    const pathname = usePathname();
    const isStatusPage = pathname === '/settings/status-page' || pathname.startsWith('/settings/status-page/');

    return (
        <main className="settings-shell">
            <header className="settings-header">
                <h1>{isStatusPage ? 'Status Page Settings' : 'Settings'}</h1>
                <p>
                    {isStatusPage
                        ? 'Configure your public status page with detailed customization options.'
                        : 'Manage your account preferences, security, and system configuration.'}
                </p>
            </header>
            <div className={`settings-grid${isStatusPage ? ' settings-grid-single' : ''}`}>
                {!isStatusPage && <SettingsNav isAdmin={isAdmin} />}
                <section className="settings-content">
                    {children}
                </section>
            </div>
        </main>
    );
}
