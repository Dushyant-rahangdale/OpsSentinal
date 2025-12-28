import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import NotificationHistory from '@/components/settings/NotificationHistory';

export default async function NotificationHistoryPage() {
    const permissions = await getUserPermissions();

    if (!permissions) {
        redirect('/login');
    }

    return (
        <SettingsPage
            currentPageId="notification-history"
            backHref="/settings"
            title="Notification History"
            description="Track delivery status and history across all notification channels."
        >
            <SettingsSectionCard
                title="Delivery status"
                description="Monitor outbound notifications and troubleshoot failures."
            >
                <NotificationHistory />
            </SettingsSectionCard>
        </SettingsPage>
    );
}


