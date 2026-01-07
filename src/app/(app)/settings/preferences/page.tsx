import prisma from '@/lib/prisma';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import PreferencesForm from '@/components/settings/PreferencesForm';
import NotificationPreferencesForm from '@/components/settings/NotificationPreferencesForm';
import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';
import { SettingsSection } from '@/components/settings/layout/SettingsSection';

export default async function PreferencesSettingsPage() {
    const session = await getServerSession(await getAuthOptions());
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
        <div className="space-y-6">
            <SettingsPageHeader
                title="Preferences"
                description="Personalize how OpsSentinal appears and notifies you."
                backHref="/settings"
                backLabel="Back to Settings"
            />

            <SettingsSection
                title="General preferences"
                description="Set your timezone and summary preferences."
            >
                <PreferencesForm
                    timeZone={user?.timeZone ?? 'UTC'}
                    dailySummary={user?.dailySummary ?? true}
                    incidentDigest={(user?.incidentDigest as string) ?? 'HIGH'}
                />
            </SettingsSection>

            <SettingsSection
                title="Notification preferences"
                description="Choose how you want to receive incident notifications."
                footer={
                    <p className="text-sm text-muted-foreground">
                        Preference updates apply to this workspace once saved.
                    </p>
                }
            >
                <NotificationPreferencesForm
                    emailEnabled={user?.emailNotificationsEnabled ?? false}
                    smsEnabled={user?.smsNotificationsEnabled ?? false}
                    pushEnabled={user?.pushNotificationsEnabled ?? false}
                    whatsappEnabled={user?.whatsappNotificationsEnabled ?? false}
                    phoneNumber={user?.phoneNumber ?? null}
                />
            </SettingsSection>
        </div>
    );
}
