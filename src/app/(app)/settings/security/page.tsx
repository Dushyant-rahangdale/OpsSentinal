import prisma from '@/lib/prisma';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import SecurityForm from '@/components/settings/SecurityForm';
import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';
import { SettingsSection } from '@/components/settings/layout/SettingsSection';
import { Badge } from '@/components/ui/shadcn/badge';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import Link from 'next/link';

export default async function SecuritySettingsPage() {
  const session = await getServerSession(await getAuthOptions());
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { passwordHash: true, updatedAt: true, timeZone: true },
      })
    : null;

  const oidcConfig = await prisma.oidcConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  const systemSettings = await prisma.systemSettings.findUnique({
    where: { id: 'default' },
    select: { appUrl: true },
  });

  const callbackBase = systemSettings?.appUrl || process.env.NEXT_PUBLIC_APP_URL || '';
  const callbackUrl = callbackBase
    ? `${callbackBase.replace(/\/$/, '')}/api/auth/callback/oidc`
    : '/api/auth/callback/oidc';
  const hasEncryptionKey = Boolean(process.env.ENCRYPTION_KEY);

  const ssoEnabled = Boolean(oidcConfig?.enabled);
  const hasPassword = Boolean(user?.passwordHash);
  const timeZone = getUserTimeZone(user ?? undefined);
  const isAdmin = (session?.user as any)?.role === 'ADMIN'; // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <div className="space-y-6 [zoom:0.7]">
      <SettingsPageHeader
        title="Security"
        description="Control how you sign in and monitor account activity."
        backHref="/settings"
        backLabel="Back to Settings"
      />

      <SettingsSection
        title="Security overview"
        description="Your sign-in methods and recent updates."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">Single sign-on</span>
            <p className="text-lg font-semibold mt-1">{ssoEnabled ? 'Enabled' : 'Disabled'}</p>
            <span className="text-xs text-muted-foreground">
              Authenticate with your identity provider.
            </span>
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">Password</span>
            <p className="text-lg font-semibold mt-1">{hasPassword ? 'Set' : 'Not set'}</p>
            <span className="text-xs text-muted-foreground">
              Use a local password when SSO is unavailable.
            </span>
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">Last updated</span>
            <p className="text-lg font-semibold mt-1">
              {user?.updatedAt
                ? formatDateTime(user.updatedAt, timeZone, { format: 'datetime' })
                : 'No recent changes'}
            </p>
            <span className="text-xs text-muted-foreground">
              Recent credential change timestamp.
            </span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Single sign-on (OIDC)"
        description="SSO configuration has moved to System Settings."
        action={
          <Badge variant={ssoEnabled ? 'default' : 'secondary'}>
            {ssoEnabled ? 'Active' : 'Inactive'}
          </Badge>
        }
      >
        <p className="text-sm text-muted-foreground">
          SSO settings are now managed in{' '}
          <Link href="/settings/system" className="underline hover:text-foreground">
            System Settings
          </Link>
          .{isAdmin ? ' (Admin access required)' : ' (Contact your administrator)'}
        </p>
      </SettingsSection>

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
    </div>
  );
}
