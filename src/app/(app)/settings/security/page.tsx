import prisma from '@/lib/prisma';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import SecurityForm from '@/components/settings/SecurityForm';
import ActiveSessionsSection from '@/components/settings/ActiveSessionsSection';

import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';
import { SettingsSection } from '@/components/settings/layout/SettingsSection';

export default async function SecuritySettingsPage() {
  const session = await getServerSession(await getAuthOptions());
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { passwordHash: true },
      })
    : null;

  const hasPassword = Boolean(user?.passwordHash);

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Security"
        description="Control how you sign in and monitor account activity."
        backHref="/settings"
        backLabel="Back to Settings"
      />

      <SettingsSection
        title="Password"
        description="Update your account password."
        footer={
          <p className="text-sm text-muted-foreground">
            For password resets or session issues, contact your OpsKnight administrator.
          </p>
        }
      >
        <SecurityForm hasPassword={hasPassword} />
      </SettingsSection>

      <SettingsSection
        title="Active Sessions"
        description="Manage your active sessions across all devices."
        footer={
          <p className="text-sm text-muted-foreground">
            Revoking all sessions will sign you out from every device immediately.
          </p>
        }
      >
        <ActiveSessionsSection />
      </SettingsSection>
    </div>
  );
}
