import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import NotificationProviderSettings from '../../../../components/settings/NotificationProviderSettings';

export default async function NotificationProviderSettingsPage() {
    const permissions = await getUserPermissions();
    
    if (!permissions.isAdmin) {
        redirect('/settings');
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Notification Providers
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Configure SMS and push notification providers for your organization
                </p>
            </div>

            <NotificationProviderSettings />
        </div>
    );
}

