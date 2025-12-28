'use client';

import { usePathname } from 'next/navigation';
import SettingsNav from '@/components/settings/SettingsNav';

type Props = {
    isAdmin: boolean;
    isResponderOrAbove: boolean;
    children: React.ReactNode;
};

export default function SettingsLayoutShell({ isAdmin, isResponderOrAbove, children }: Props) {
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
            <div className={`settings-layout${isStatusPage ? ' settings-layout-full' : ''}`}>
                <aside className="settings-nav-shell">
                    <SettingsNav isAdmin={isAdmin} isResponderOrAbove={isResponderOrAbove} />
                </aside>
                <section className="settings-content">
                    {children}
                </section>
            </div>
        </main>
    );
}
