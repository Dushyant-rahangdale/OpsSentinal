import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import PreferencesForm from '@/components/settings/PreferencesForm';
import NotificationPreferencesForm from '@/components/settings/NotificationPreferencesForm';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';

export default async function PreferencesSettingsPage() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const user = email
        ? await prisma.user.findUnique({
            where: { email },
            select: {
                timeZone: true,
                dailySummary: true,
                incidentDigest: true,
                emailNotificationsEnabled: true,
                smsNotificationsEnabled: true,
                pushNotificationsEnabled: true,
                whatsappNotificationsEnabled: true,
                phoneNumber: true
            }
        })
        : null;

    return (
        <SettingsPage
            currentPageId="preferences"
            backHref="/settings"
            title="Preferences"
            description="Personalize how OpsSentinal appears and notifies you."
        >
            <SettingsSectionCard
                title="General preferences"
                description="Set your timezone and summary preferences."
            >
                <PreferencesForm
                    timeZone={user?.timeZone ?? 'UTC'}
                    dailySummary={user?.dailySummary ?? true}
                    incidentDigest={(user?.incidentDigest as string) ?? 'HIGH'}
                />
            </SettingsSectionCard>

            <SettingsSectionCard
                title="Notification preferences"
                description="Choose how you want to receive incident notifications."
            >
                <NotificationPreferencesForm
                    emailEnabled={user?.emailNotificationsEnabled ?? false}
                    smsEnabled={user?.smsNotificationsEnabled ?? false}
                    pushEnabled={user?.pushNotificationsEnabled ?? false}
                    whatsappEnabled={user?.whatsappNotificationsEnabled ?? false}
                    phoneNumber={user?.phoneNumber ?? null}
                />
                <div className="settings-inline-note">
                    Preference updates apply to this workspace once saved.
                </div>
            </SettingsSectionCard>
        </SettingsPage>
    );
}


