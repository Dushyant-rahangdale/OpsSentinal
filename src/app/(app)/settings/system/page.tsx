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

  // Fetch system settings for app URL
  const appUrlData = {
    appUrl: null as string | null,
    fallback: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };

  try {
    const settings = await import('@/lib/prisma').then(m =>
      m.default.systemSettings.findUnique({
        where: { id: 'default' },
        select: { appUrl: true },
      })
    );

    if (settings) {
      appUrlData.appUrl = settings.appUrl;
    }
  } catch (error) {
    logger.warn('Failed to fetch app URL settings from DB', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

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
    </SettingsPage>
  );
}
