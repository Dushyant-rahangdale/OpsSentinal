import { getUserPermissions } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import SystemNotificationSettings from '@/components/settings/SystemNotificationSettings';
import AppUrlSettings from '@/components/settings/AppUrlSettings';
import SettingsSection from '@/components/settings/SettingsSection';
import { getNotificationProviders } from './actions';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;


export default async function SystemSettingsPage() {
    const permissions = await getUserPermissions();

    // Show access denied message for non-admins instead of redirecting
    if (!permissions.isAdmin) {
        return (
            <SettingsSection
                title="Notification Providers"
                description="Configure notification providers for email, SMS, and push notifications. These settings apply system-wide."
            >
                <div className="glass-panel" style={{
                    padding: '2rem',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    borderRadius: '0px',
                    background: '#f9fafb'
                }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: '1rem'
                    }}>!</div>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                    }}>
                        Access Restricted
                    </h3>
                    <p style={{
                        color: 'var(--text-muted)',
                        marginBottom: '1.5rem'
                    }}>
                        You need administrator privileges to access system settings.
                    </p>
                    <div style={{
                        padding: '1rem',
                        background: '#fef3c7',
                        border: '1px solid #fbbf24',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        color: '#92400e',
                        marginTop: '1rem'
                    }}>
                        Your current role: <strong>{permissions.role}</strong>. Admin role required.
                    </div>
                    <p style={{
                        marginTop: '1.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)'
                    }}>
                        Please contact your system administrator to upgrade your account.
                    </p>
                </div>
            </SettingsSection>
        );
    }

    let providers: Awaited<ReturnType<typeof getNotificationProviders>> = [];
    try {
        providers = await getNotificationProviders();
    } catch (error) {
        logger.error('Error loading notification providers', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with empty providers array if there's an error
    }

    // Fetch app URL settings directly from DB
    let appUrlData = { appUrl: null as string | null, fallback: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' };
    try {
        const settings = await import('@/lib/prisma').then(m => m.default.systemSettings.findUnique({
            where: { id: 'default' },
            select: { appUrl: true }
        }));

        if (settings) {
            appUrlData.appUrl = settings.appUrl;
        }
    } catch (error) {
        logger.warn('Failed to fetch app URL settings from DB', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    return (
        <>
            <SettingsSection
                title="Application Settings"
                description="Configure core application settings that affect system-wide behavior."
            >
                <AppUrlSettings
                    appUrl={appUrlData.appUrl}
                    fallback={appUrlData.fallback}
                />
            </SettingsSection>

            <SettingsSection
                title="Notification Providers"
                description="Configure notification providers for email, SMS, and push notifications. These settings apply system-wide."
            >
                <SystemNotificationSettings
                    providers={providers}
                />

                <div className="settings-note" style={{ marginTop: '2rem' }}>
                    <strong>Note:</strong> Sensitive credentials are stored encrypted. Changes take effect immediately.
                    <br />
                    Environment variables (if set) will override these settings.
                </div>
            </SettingsSection>
        </>
    );
}




