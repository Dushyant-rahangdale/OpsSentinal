import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import StatusPageConfig from '@/components/StatusPageConfig';
import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';

export default async function StatusPageWorkspace({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const session = await getServerSession(await getAuthOptions());
  if (!session) redirect('/login');
  try {
    await assertAdmin();
  } catch {
    redirect('/');
  }

  const { pageId } = await params;
  const [statusPage, allServices] = await Promise.all([
    prisma.statusPage.findUnique({
      where: { id: pageId },
      include: {
        services: { include: { service: true } },
        announcements: { orderBy: { startDate: 'desc' }, take: 20 },
        apiTokens: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    }),
    prisma.service.findMany({ orderBy: { name: 'asc' } }),
  ]);
  if (!statusPage) notFound();

  const formattedStatusPage = {
    ...statusPage,
    allowedCustomFields: Array.isArray(statusPage.allowedCustomFields)
      ? statusPage.allowedCustomFields.filter((value): value is string => typeof value === 'string')
      : [],
    announcements: statusPage.announcements.map(announcement => ({
      ...announcement,
      startDate: announcement.startDate.toISOString(),
      endDate: announcement.endDate?.toISOString() || null,
      affectedServiceIds: Array.isArray(announcement.affectedServiceIds)
        ? (announcement.affectedServiceIds as string[])
        : null,
    })),
    apiTokens: statusPage.apiTokens.map(token => ({
      ...token,
      createdAt: token.createdAt.toISOString(),
      lastUsedAt: token.lastUsedAt?.toISOString() || null,
      revokedAt: token.revokedAt?.toISOString() || null,
    })),
  };
  const publicHref = `/status${statusPage.slug ? `/${statusPage.slug}` : ''}`;

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title={statusPage.name}
        description={`${statusPage.isDefault ? 'Default status page · ' : ''}${statusPage.enabled ? 'Enabled' : 'Disabled'} · independently configured`}
        backHref="/settings/status-pages"
        backLabel="All status pages"
        actions={
          statusPage.enabled && !statusPage.requireAuth ? (
            <Link
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Open public page
            </Link>
          ) : undefined
        }
      />
      <StatusPageConfig
        key={statusPage.id}
        statusPage={formattedStatusPage}
        allServices={allServices}
      />
    </div>
  );
}
