import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';
import { StatusPageManager } from '@/components/status-page/StatusPageManager';

export default async function StatusPagesControlCenter() {
  const session = await getServerSession(await getAuthOptions());
  if (!session) redirect('/login');
  try {
    await assertAdmin();
  } catch {
    redirect('/');
  }

  const pages = await prisma.statusPage.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      enabled: true,
      isDefault: true,
      privacyMode: true,
      customDomain: true,
      subdomain: true,
      updatedAt: true,
      _count: { select: { services: true, subscriptions: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Status Pages"
        description="Manage independent public communication surfaces. No page inherits configuration from the default page."
        backHref="/settings"
        backLabel="Back to Settings"
        actions={<StatusPageManager />}
      />
      {pages.length === 0 ? (
        <section className="rounded-lg border border-dashed bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No public status pages yet</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your first disabled page, configure it, then publish it.
          </p>
          <div className="mt-5 flex justify-center">
            <StatusPageManager />
          </div>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pages.map(page => {
            const publicHref = page.customDomain
              ? `https://${page.customDomain}`
              : `/status${page.slug ? `/${page.slug}` : ''}`;
            return (
              <article key={page.id} className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-950">{page.name}</h2>
                      {page.isDefault && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          Default
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${page.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {page.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {page.customDomain || page.subdomain || publicHref}
                    </p>
                    <p className="mt-3 text-sm text-gray-600">
                      {page._count.services} services · {page._count.subscriptions} subscribers ·{' '}
                      {page.privacyMode || 'PUBLIC'}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Link
                    href={publicHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border px-3 py-2 text-sm font-medium"
                  >
                    Open page
                  </Link>
                  <Link
                    href={`/settings/status-pages/${encodeURIComponent(page.id)}`}
                    className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Manage
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
