/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import StatusPageSnapshotView from '@/components/status-page/StatusPageSnapshotView';
import { getAuthOptions } from '@/lib/auth';
import { getBaseUrl } from '@/lib/env-validation';
import { getStatusPagePublicUrl } from '@/lib/status-page-url';
import { getStatusPageSnapshotByRoute } from '@/lib/status-pages/snapshot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicStatusMetadata();
}

export async function getPublicStatusMetadata(slug?: string): Promise<Metadata> {
  const projected = await getStatusPageSnapshotByRoute(slug || 'default');
  const statusPage = projected.snapshot?.page;
  if (!statusPage) {
    return { title: 'Status Page', description: 'Service status and incident information' };
  }

  const branding =
    statusPage.branding && typeof statusPage.branding === 'object' && !Array.isArray(statusPage.branding)
      ? (statusPage.branding as Record<string, any>)
      : {};
  const title = (branding.metaTitle as string) || statusPage.name;
  const description =
    (branding.metaDescription as string) || `Status page for ${statusPage.name}`;
  const baseUrl = getBaseUrl();
  const rssUrl = slug
    ? `${baseUrl}/api/status/${encodeURIComponent(slug)}/rss`
    : `${baseUrl}/api/status/rss`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: getStatusPagePublicUrl(statusPage, baseUrl),
      siteName: statusPage.name,
      type: 'website',
    },
    twitter: { card: 'summary', title, description },
    alternates: { types: { 'application/rss+xml': rssUrl } },
  };
}

export default async function PublicStatusPage() {
  return renderPublicStatusPage();
}

export async function renderPublicStatusPage(slug?: string) {
  const projected = await getStatusPageSnapshotByRoute(slug || 'default');
  const statusPage = projected.snapshot?.page;

  if (!statusPage) {
    return <Unavailable message="Status page is not configured." />;
  }
  if (statusPage.enabled === false) {
    return <Unavailable message="This status page is currently disabled." />;
  }
  if (statusPage.requireAuth) {
    const session = await getServerSession(await getAuthOptions());
    if (!session) {
      const callbackUrl = slug ? `/status/${encodeURIComponent(slug)}` : '/status';
      redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }
  if (!projected.snapshot) {
    return <Unavailable message="Status information is temporarily unavailable." />;
  }

  return (
    <StatusPageSnapshotView
      page={statusPage}
      snapshot={projected.snapshot}
      stale={projected.stale}
    />
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        color: '#374151',
      }}
    >
      <p>{message}</p>
    </main>
  );
}
