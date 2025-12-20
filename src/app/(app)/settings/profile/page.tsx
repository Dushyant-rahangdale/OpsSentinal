import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import ProfileForm from '@/components/settings/ProfileForm';

export default async function ProfileSettingsPage() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const name = session?.user?.name ?? '';
    const role = (session?.user as any)?.role ?? 'USER';

    const user = email
        ? await prisma.user.findUnique({
            where: { email },
            select: { createdAt: true }
        })
        : null;

    return (
        <div className="settings-section">
            <header className="settings-section-header">
                <h2>Profile</h2>
                <p>Identity details tied to your OpsGuard account.</p>
            </header>
            <ProfileForm
                name={name}
                email={email}
                role={role}
                memberSince={user?.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown'}
            />
            <div className="settings-note">
                Updates are managed by your identity provider or an OpsGuard administrator.
            </div>
        </div>
    );
}
