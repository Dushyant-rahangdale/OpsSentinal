import prisma from '@/lib/prisma';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import ProfileForm from '@/components/settings/ProfileForm';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

export default async function ProfileSettingsPage() {
  const session = await getServerSession(await getAuthOptions());
  const email = session?.user?.email ?? null;

  // Fetch user data from database to get the latest name
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: {
          name: true,
          role: true,
          createdAt: true,
          timeZone: true,
          department: true,
          jobTitle: true,
          avatarUrl: true,
          lastOidcSync: true,
        },
      })
    : null;

  const name = user?.name || session?.user?.name || '';
  const role = user?.role || (session?.user as any)?.role || 'USER'; // eslint-disable-line @typescript-eslint/no-explicit-any
  const timeZone = getUserTimeZone(user ?? undefined);
  const memberSince = user?.createdAt
    ? formatDateTime(user.createdAt, timeZone, { format: 'date' })
    : 'Unknown';
  const lastOidcSync = user?.lastOidcSync
    ? formatDateTime(user.lastOidcSync, timeZone, { format: 'datetime' })
    : null;

  return (
    <SettingsPage
      currentPageId="profile"
      backHref="/settings"
      title="Profile"
      description="Identity details tied to your OpsSentinal account."
    >
      <SettingsSectionCard
        title="Account details"
        description="Keep your profile up to date across the workspace."
      >
        <ProfileForm
          name={name}
          email={email}
          role={role}
          memberSince={memberSince}
          department={user?.department}
          jobTitle={user?.jobTitle}
          avatarUrl={user?.avatarUrl}
          lastOidcSync={lastOidcSync}
        />
        <div className="settings-inline-note">
          Updates are managed by your identity provider or an OpsSentinal administrator.
        </div>
      </SettingsSectionCard>
    </SettingsPage>
  );
}
