import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import SystemNotificationSettings from '@/components/settings/SystemNotificationSettings';
import { getNotificationProviders } from '@/app/(app)/settings/system/actions';

export default async function NotificationProviderSettingsPage() {
    const permissions = await getUserPermissions();

    if (!permissions.isAdmin) {
        redirect('/settings');
    }
    const providers = await getNotificationProviders();

    return (
        <SettingsPage
            currentPageId="notifications-admin"
            backHref="/settings"
            title="Notification Providers"
            description="Configure email, SMS, push, and WhatsApp notification providers for your organization."
        >
            <SettingsSectionCard
                title="Provider configuration"
                description="Manage outbound providers for all delivery channels."
            >
                <SystemNotificationSettings providers={providers} />
            </SettingsSectionCard>
        </SettingsPage>
    );
}


