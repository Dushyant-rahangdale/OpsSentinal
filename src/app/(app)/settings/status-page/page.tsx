import { redirect } from 'next/navigation';

/**
 * Compatibility route for bookmarks from the single-page settings UI.
 * Page identity now lives in the route instead of mutable query state.
 */
export default async function LegacyStatusPageSettings({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  redirect(page ? `/settings/status-pages/${encodeURIComponent(page)}` : '/settings/status-pages');
}
