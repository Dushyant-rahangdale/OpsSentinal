import type { CSSProperties } from 'react';
import StatusPageAnnouncements from './StatusPageAnnouncements';
import StatusPageAutoRefresh from './StatusPageAutoRefresh';
import StatusPageHeader from './StatusPageHeader';
import StatusPageIncidents from './StatusPageIncidents';
import PublicStatusServices from './PublicStatusServices';
import StatusPageSubscribe from './StatusPageSubscribe';
import type { StatusPageSnapshot } from '@/lib/status-pages/snapshot';
import {
  createStatusPageViewModel,
  type StatusPageSnapshotPage,
} from '@/lib/status-pages/view-model';
import { toSafeStyleTagContent } from '@/lib/status-page-content';
import { computeStatusPageTheme } from '@/lib/status-page-theme';
import { statusPresentation } from '@/lib/status-pages/status-presentation';

export default function StatusPageSnapshotView({
  page,
  snapshot,
  stale,
}: {
  page: StatusPageSnapshotPage;
  snapshot: StatusPageSnapshot;
  stale: boolean;
}) {
  const view = createStatusPageViewModel(page, snapshot);
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
  const statusPagePath =
    page.slug && !page.isDefault ? `/status/${encodeURIComponent(page.slug)}` : '/status';
  const apiPath =
    page.slug && !page.isDefault ? `/api/status/${encodeURIComponent(page.slug)}` : '/api/status';
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
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {branding.autoRefresh !== false && (
        <StatusPageAutoRefresh enabled intervalSeconds={Math.max(30, refreshInterval)} />
      )}
      <div style={{ maxWidth, margin: '0 auto' }}>
        {branding.showHeader !== false && (
          <StatusPageHeader
            statusPage={page}
            overallStatus={snapshot.status === 'OPERATIONAL' ? 'operational'
              : snapshot.status === 'MAINTENANCE' ? 'maintenance'
                : snapshot.status === 'MAJOR_OUTAGE' || snapshot.status === 'PARTIAL_OUTAGE' ? 'outage'
                  : snapshot.status === 'UNKNOWN' ? 'unknown' : 'degraded'}
            branding={branding}
            lastUpdated={snapshot.generatedAt}
          />
        )}
        {stale && <p role="note">Showing the last verified status update.</p>}
        <StatusPageAnnouncements
          announcements={view.announcements.filter(item => item.type !== 'UPDATE')}
          showServiceRegions={snapshot.services.some(service => service.regions !== undefined)}
        />
        {page.showRegionHeatmap === true && snapshot.regions.length > 0 && (
          <section aria-labelledby="region-health-heading" className="public-regions">
            <h2 id="region-health-heading">Region health</h2>
            {snapshot.regions.map(region => {
              const presentation = statusPresentation(region.status);
              return <article key={region.name} className="public-region-card">
                <strong>{region.name}</strong>
                <span className={`status-badge status-${presentation.token}`}>{presentation.icon} {presentation.label}</span>
                <span>{region.totalServices} services · {region.impactedServices} impacted</span>
                <span>{region.operationalServices} operational · {region.degradedServices} degraded · {region.maintenanceServices} maintenance · {region.partialOutageServices} partial · {region.majorOutageServices} major · {region.unknownServices} unknown</span>
              </article>;
            })}
          </section>
        )}
        <PublicStatusServices
          services={snapshot.services}
          groupByRegion={page.showServicesByRegion === true}
        />
        <StatusPageIncidents
          incidents={view.incidents}
          privacySettings={{
            showIncidentTitles: snapshot.incidents.some(item => typeof item.title === 'string'),
            showIncidentDescriptions: snapshot.incidents.some(
              item => typeof item.description === 'string'
            ),
            showAffectedServices: snapshot.incidents.some(item => item.service !== undefined),
            showIncidentTimestamps: snapshot.incidents.some(
              item => typeof item.createdAt === 'string'
            ),
            showIncidentUrgency: snapshot.incidents.some(item => typeof item.urgency === 'string'),
          }}
          showPostIncidentReview={page.showPostIncidentReview}
          statusPagePath={statusPagePath}
        />
        {page.showChangelog !== false &&
          view.announcements.some(item => item.type === 'UPDATE') && (
            <section>
              <h2>Changelog</h2>
              <StatusPageAnnouncements
                announcements={view.announcements.filter(item => item.type === 'UPDATE')}
              />
            </section>
          )}
        {page.showSubscribe !== false && <StatusPageSubscribe statusPageId={page.id} />}
        {branding.showFooter !== false && (
          <footer style={{ marginTop: '3rem', opacity: 0.75 }}>
            <p>{page.footerText || 'Powered by OpsKnight'}</p>
            <nav
              aria-label="Status resources"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
            >
              {branding.showApiLink !== false && <a href={apiPath}>JSON API</a>}
              {branding.showRssLink !== false && <a href={`${apiPath}/rss`}>RSS</a>}
              {page.enableUptimeExports === true && Object.keys(view.uptime).length > 0 && (
                <>
                  <a href={`${apiPath}/uptime-export?format=csv`}>Uptime CSV</a>
                  <a href={`${apiPath}/uptime-export?format=pdf`}>Uptime PDF</a>
                </>
              )}
              {page.contactEmail && <a href={`mailto:${page.contactEmail}`}>Contact</a>}
              {page.contactUrl && <a href={page.contactUrl}>Support</a>}
            </nav>
          </footer>
        )}
      </div>
    </main>
  );
}
