import { getUserPermissions } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import AppUrlSettings from '@/components/settings/AppUrlSettings';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;


export default async function SystemSettingsPage() {
    const permissions = await getUserPermissions();

    // Show access denied message for non-admins instead of redirecting
    if (!permissions.isAdmin) {
        return (
            <SettingsPage
                currentPageId="system"
                backHref="/settings"
                title="System Settings"
                description="Application-wide configuration and defaults."
            >
                <SettingsSectionCard
                    title="Access restricted"
                    description="Administrator access required to view these settings."
                >
                    <div className="settings-empty-state-v2">
                        <div className="settings-empty-icon">!</div>
                        <h3>Admin role required</h3>
                        <p>Your current role is {permissions.role}. Contact an administrator for access.</p>
                    </div>
                </SettingsSectionCard>
            </SettingsPage>
        );
    }


    // Fetch system settings for app URL and encryption key check header
    let appUrlData = { appUrl: null as string | null, fallback: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' };
    let hasEncryptionKey = false;
    let ssoConfig = null;

    try {
        const prisma = await import('@/lib/prisma').then(m => m.default);

        const systemSettings = await prisma.systemSettings.findUnique({
            where: { id: 'default' },
            select: { appUrl: true, encryptionKey: true }
        });

        if (systemSettings) {
            appUrlData.appUrl = systemSettings.appUrl;
            // Check if key exists in DB or Env
            hasEncryptionKey = Boolean(systemSettings.encryptionKey || process.env.ENCRYPTION_KEY);
        } else {
            hasEncryptionKey = Boolean(process.env.ENCRYPTION_KEY);
        }

        // Fetch SSO config
        const oidcConfig = await prisma.oidcConfig.findFirst({
            orderBy: { updatedAt: 'desc' }
        });

        if (oidcConfig) {
            ssoConfig = {
                enabled: oidcConfig.enabled,
                issuer: oidcConfig.issuer,
                clientId: oidcConfig.clientId,
                autoProvision: oidcConfig.autoProvision,
                allowedDomains: oidcConfig.allowedDomains ?? [],
                hasClientSecret: Boolean(oidcConfig.clientSecret)
            };
        }

    } catch (error) {
        logger.warn('Failed to fetch system settings from DB', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    // Determine secure callback URL
    const callbackBase = appUrlData.appUrl || appUrlData.fallback;
    const callbackUrl = callbackBase
        ? `${callbackBase.replace(/\/$/, '')}/api/auth/callback/oidc`
        : '/api/auth/callback/oidc';


    // Import components dynamically or statically
    const EncryptionKeyForm = (await import('@/components/settings/EncryptionKeyForm')).default;
    const SsoSettingsForm = (await import('@/components/settings/SsoSettingsForm')).default;

    return (
        <SettingsPage
            currentPageId="system"
            backHref="/settings"
            title="System Settings"
            description="Configure core application settings that affect system-wide behavior."
        >
            <SettingsSectionCard
                title="Application URL"
                description="Used in emails, webhooks, and RSS feeds."
            >
                <AppUrlSettings
                    appUrl={appUrlData.appUrl}
                    fallback={appUrlData.fallback}
                />
            </SettingsSectionCard>

            <SettingsSectionCard
                title="System Security"
                description="Manage encryption keys and Single Sign-On (SSO) configuration."
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div>
                        <h4 className="settings-subsection-title">Encryption Key</h4>
                        <p className="settings-subsection-description">
                            Required for securing sensitive data like API tokens and SSO secrets.
                        </p>
                        <EncryptionKeyForm hasKey={hasEncryptionKey} />
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                        <h4 className="settings-subsection-title">Single Sign-On (OIDC)</h4>
                        <p className="settings-subsection-description">
                            Configure OpenID Connect provider (e.g., Auth0, Okta) for employee login.
                        </p>
                        <SsoSettingsForm
                            initialConfig={ssoConfig}
                            callbackUrl={callbackUrl}
                            hasEncryptionKey={hasEncryptionKey}
                        />
                    </div>
                </div>
            </SettingsSectionCard>

        </SettingsPage>
    );
}





