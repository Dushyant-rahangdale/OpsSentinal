import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import PreferencesForm from '@/components/settings/PreferencesForm';

export default async function PreferencesSettingsPage() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const user = email
        ? await prisma.user.findUnique({
            where: { email },
            select: { timeZone: true, dailySummary: true, incidentDigest: true }
        })
        : null;

    return (
        <div className="settings-section">
            <header className="settings-section-header">
                <h2>Preferences</h2>
                <p>Personalize how OpsGuard appears and notifies you.</p>
            </header>
            <PreferencesForm
                timeZone={user?.timeZone ?? 'UTC'}
                dailySummary={user?.dailySummary ?? true}
                incidentDigest={(user?.incidentDigest as string) ?? 'HIGH'}
            />
            <div className="settings-note">
                Preference updates apply to this workspace once saved.
            </div>
        </div>
    );
}
