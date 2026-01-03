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
        <div className="system-settings-shell">
          <section className="system-settings-empty">
            <div className="system-settings-empty-card">
              <div className="system-settings-empty-icon">!</div>
              <h2>Admin role required</h2>
              <p>Your current role is {permissions.role}. Contact an administrator for access.</p>
              <div className="system-settings-empty-meta">
                <span className="system-settings-pill is-off">Access restricted</span>
                <span className="system-settings-empty-role">Current role: {permissions.role}</span>
              </div>
            </div>
          </section>
        </div>
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
  const encryptionStatus = isSystemLocked
    ? 'Needs attention'
    : encryptionKeySet
      ? 'Configured'
      : 'Missing';
  const encryptionTone = isSystemLocked ? 'warn' : encryptionKeySet ? 'ok' : 'off';
  const ssoStatus = oidcConfig?.enabled ? 'Enabled' : 'Disabled';
  const ssoTone = oidcConfig?.enabled ? 'ok' : 'off';
  const appUrlStatus = appUrlData.appUrl ? 'Custom' : 'Fallback';
  const appUrlTone = appUrlData.appUrl ? 'ok' : 'off';

  return (
    <SettingsPage
      currentPageId="system"
      backHref="/settings"
      title="System Settings"
      description="Configure core application settings that affect system-wide behavior."
    >
      <div className="system-settings-shell">
        <section className="system-settings-hero">
          <div className="system-settings-hero-copy">
            <span className="system-settings-eyebrow">System controls</span>
            <h2>High impact configuration</h2>
            <p>
              Set the global foundation for URLs, encryption, and identity so every workspace stays
              consistent and secure.
            </p>
          </div>
          <div className="system-settings-hero-meta">
            <div className="system-settings-meta-card">
              <span className="system-settings-meta-label">Scope</span>
              <strong>Admin only</strong>
              <p className="system-settings-meta-note">
                Changes apply to every project, user, and integration in this workspace.
              </p>
            </div>
            <div className="system-settings-meta-card">
              <span className="system-settings-meta-label">Status</span>
              <div className="system-settings-meta-row">
                <span>App URL</span>
                <span className={`system-settings-pill is-${appUrlTone}`}>{appUrlStatus}</span>
              </div>
              <div className="system-settings-meta-row">
                <span>Encryption</span>
                <span className={`system-settings-pill is-${encryptionTone}`}>
                  {encryptionStatus}
                </span>
              </div>
              <div className="system-settings-meta-row">
                <span>SSO</span>
                <span className={`system-settings-pill is-${ssoTone}`}>{ssoStatus}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="system-settings-grid">
          <div className="system-settings-stack">
            <div id="system-settings-app-url">
              <SettingsSectionCard
                title="Application URL"
                description="Used in emails, webhooks, and RSS feeds."
                className="system-settings-card"
              >
                <div className="system-settings-chips">
                  <span className="system-settings-chip">System-wide</span>
                  <span className="system-settings-chip">Notifications</span>
                </div>
                <div className="system-settings-helper">
                  <strong>Why this matters</strong>
                  <p>Used for links in notifications, public status pages, and webhook payloads.</p>
                </div>
                <AppUrlSettings appUrl={appUrlData.appUrl} fallback={appUrlData.fallback} />
              </SettingsSectionCard>
            </div>

            <div id="system-settings-encryption">
              <SettingsSectionCard
                title="Encryption Key"
                description="Required for securing sensitive credentials like SSO secrets."
                className="system-settings-card"
              >
                <div className="system-settings-chips">
                  <span className="system-settings-chip">Sensitive</span>
                  <span className="system-settings-chip">Backups</span>
                </div>
                <div className="system-settings-helper">
                  <strong>Handle with care</strong>
                  <p>Rotate only when you have the current key and a backup plan.</p>
                </div>
                <EncryptionKeyForm hasKey={encryptionKeySet} isSystemLocked={isSystemLocked} />
              </SettingsSectionCard>
            </div>

            <div id="system-settings-sso">
              <SettingsSectionCard
                title="Single Sign-On (OIDC)"
                description="Allow users to log in with your identity provider."
                className="system-settings-card"
              >
                <div className="system-settings-chips">
                  <span className="system-settings-chip">Authentication</span>
                  <span className="system-settings-chip">OIDC</span>
                </div>
                <div className="system-settings-helper">
                  <strong>Common pitfall</strong>
                  <p>Double-check redirect URLs before enabling SSO for all users.</p>
                </div>
                <SsoSettingsForm
                  initialConfig={oidcConfig}
                  callbackUrl={`${appUrlData.appUrl || 'https://your-ops-sentinel.com'}/api/auth/callback/oidc`}
                  hasEncryptionKey={encryptionKeySet}
                  configError={integrityCheck.ok ? undefined : integrityCheck.error}
                />
              </SettingsSectionCard>
            </div>
          </div>
        </div>
      </div>
    </SettingsPage>
  );
}
