import type { CSSProperties } from 'react';
import StatusPageAutoRefresh from './StatusPageAutoRefresh';
import StatusPageExperience from './StatusPageExperience';
import type { StatusPageSnapshot } from '@/lib/status-pages/snapshot';
import type { StatusPageSnapshotPage } from '@/lib/status-pages/view-model';
import { toSafeStyleTagContent } from '@/lib/status-page-content';
import { computeStatusPageTheme } from '@/lib/status-page-theme';

/**
 * Themed shell for the published status page.
 *
 * Everything a visitor sees lives in StatusPageExperience, which the admin preview renders too.
 * This wrapper owns only what is specific to serving the page as a document: the theme variables,
 * the page-width layout, customer CSS, and auto-refresh.
 */
export default function StatusPageSnapshotView({
  page,
  snapshot,
  stale,
}: {
  page: StatusPageSnapshotPage;
  snapshot: StatusPageSnapshot;
  stale: boolean;
}) {
  const branding =
    page.branding && typeof page.branding === 'object' && !Array.isArray(page.branding)
      ? (page.branding as Record<string, unknown>)
      : {};
  const theme = computeStatusPageTheme({
    primaryColor: typeof branding.primaryColor === 'string' ? branding.primaryColor : undefined,
    backgroundColor:
      typeof branding.backgroundColor === 'string' ? branding.backgroundColor : undefined,
    textColor: typeof branding.textColor === 'string' ? branding.textColor : undefined,
    fontFamily: typeof branding.fontFamily === 'string' ? branding.fontFamily : undefined,
  });
  const layout =
    branding.layout === 'wide' || branding.layout === 'compact' ? branding.layout : 'default';
  const maxWidth = layout === 'wide' ? 1600 : layout === 'compact' ? 900 : 1280;
  const refreshInterval =
    typeof branding.refreshInterval === 'number' ? branding.refreshInterval : 60;
  const customCss = toSafeStyleTagContent(branding.customCss);

  return (
    <main
      className="status-page-container"
      style={{
        minHeight: '100vh',
        background: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        padding: 'clamp(1rem, 4vw, 3rem)',
        ...(theme.cssVariables as CSSProperties),
      }}
    >
      {branding.autoRefresh !== false && (
        <StatusPageAutoRefresh enabled intervalSeconds={Math.max(30, refreshInterval)} />
      )}
      <div style={{ maxWidth, margin: '0 auto' }}>
        <StatusPageExperience page={page} snapshot={snapshot} stale={stale} />
      </div>
      {/* Injected last so customer overrides win the cascade over the shared stylesheet. */}
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
    </main>
  );
}
