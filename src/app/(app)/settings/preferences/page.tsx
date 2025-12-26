import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import PreferencesForm from '@/components/settings/PreferencesForm';
import NotificationPreferencesForm from '@/components/settings/NotificationPreferencesForm';
import SettingsSection from '@/components/settings/SettingsSection';

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
        <SettingsSection
            title="Preferences"
            description="Personalize how OpsSure appears and notifies you."
        >
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    General Preferences
                </h3>
                <PreferencesForm
                    timeZone={user?.timeZone ?? 'UTC'}
                    dailySummary={user?.dailySummary ?? true}
                    incidentDigest={(user?.incidentDigest as string) ?? 'HIGH'}
                />
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    Notification Preferences
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Choose how you want to receive incident notifications. These preferences apply to all incidents you're involved with.
                </p>
                <NotificationPreferencesForm
                    emailEnabled={user?.emailNotificationsEnabled ?? false}
                    smsEnabled={user?.smsNotificationsEnabled ?? false}
                    pushEnabled={user?.pushNotificationsEnabled ?? false}
                    whatsappEnabled={user?.whatsappNotificationsEnabled ?? false}
                    phoneNumber={user?.phoneNumber ?? null}
                />
            </div>

            <div className="settings-note" style={{ marginTop: '2rem' }}>
                Preference updates apply to this workspace once saved.
            </div>
        </SettingsSection>
    );
}

