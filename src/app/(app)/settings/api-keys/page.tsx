import prisma from '@/lib/prisma';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import ApiKeysPanel from '@/components/settings/ApiKeysPanel';
import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

export default async function ApiKeysSettingsPage() {
  const session = await getServerSession(await getAuthOptions());
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, timeZone: true },
      })
    : null;
  const timeZone = getUserTimeZone(user ?? undefined);
  const keys = user
    ? await prisma.apiKey.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="API Keys"
        description="Generate keys for automation and integrations."
        backHref="/settings"
        backLabel="Back to Settings"
      />

      <ApiKeysPanel
        keys={keys.map(key => ({
          id: key.id,
          name: key.name,
          prefix: key.prefix,
          scopes: key.scopes,
          createdAt: formatDateTime(key.createdAt, timeZone, { format: 'date' }),
          lastUsedAt: key.lastUsedAt
            ? formatDateTime(key.lastUsedAt, timeZone, { format: 'date' })
            : null,
          revokedAt: key.revokedAt
            ? formatDateTime(key.revokedAt, timeZone, { format: 'date' })
            : null,
        }))}
      />
    </div>
  );
}
