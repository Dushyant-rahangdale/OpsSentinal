import { getUserPermissions } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import AppUrlSettings from '@/components/settings/AppUrlSettings';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import SsoSettingsForm from '@/components/settings/SsoSettingsForm';
import EncryptionKeyForm from '@/components/settings/EncryptionKeyForm';

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

  // Fetch system settings for app URL
  const appUrlData = {
    appUrl: null as string | null,
    fallback: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };

  // Declare systemSettings outside the try block to be accessible later
  let systemSettings: { appUrl: string | null; encryptionKey: string | null } | null = null;
  let oidcConfig: any = null; // Declare oidcConfig here

  try {
    // Fetch encryption key (sensitive, only check existence or masked)
    // But for the form, we want to allow setting it.
    // We need to fetch the actual value? Or just pass it?
    // The form typically handles "masked" values.
    systemSettings = await import('@/lib/prisma').then(m =>
      m.default.systemSettings.findUnique({
        where: { id: 'default' },
        select: { appUrl: true, encryptionKey: true },
      })
    );

    const rawOidcConfig = await import('@/lib/prisma').then(m =>
      m.default.oidcConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
    );

    if (rawOidcConfig) {
      oidcConfig = {
        enabled: rawOidcConfig.enabled,
        issuer: rawOidcConfig.issuer,
        clientId: rawOidcConfig.clientId,
        autoProvision: rawOidcConfig.autoProvision,
        allowedDomains: rawOidcConfig.allowedDomains,
        hasClientSecret: !!rawOidcConfig.clientSecret,
      };
    }

    if (systemSettings) {
      appUrlData.appUrl = systemSettings.appUrl;
    }
  } catch (error) {
    logger.warn('Failed to fetch app URL settings from DB', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const encryptionKeySet = Boolean(systemSettings?.encryptionKey);

  // Check for System Lockout (Safe Mode)
  let isSystemLocked = false;
  if (systemSettings?.encryptionKey) {
    const { validateCanary } = await import('@/lib/encryption');
    const isSafe = await validateCanary(systemSettings.encryptionKey);
    isSystemLocked = !isSafe;
  }

  const integrityCheck = await import('@/lib/oidc-config').then(m => m.checkOidcIntegrity());

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
        <AppUrlSettings appUrl={appUrlData.appUrl} fallback={appUrlData.fallback} />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Encryption Key"
        description="Required for securing sensitive credentials like SSO secrets."
      >
        <EncryptionKeyForm hasKey={encryptionKeySet} isSystemLocked={isSystemLocked} />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Single Sign-On (OIDC)"
        description="Allow users to log in with your identity provider."
      >
        <SsoSettingsForm
          initialConfig={oidcConfig}
          callbackUrl={`${appUrlData.appUrl || 'https://your-ops-sentinel.com'}/api/auth/callback/oidc`}
          hasEncryptionKey={encryptionKeySet}
          configError={integrityCheck.ok ? undefined : integrityCheck.error}
        />
      </SettingsSectionCard>
    </SettingsPage>
  );
}
