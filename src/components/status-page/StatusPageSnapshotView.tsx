import type { CSSProperties } from 'react';
import StatusPageAnnouncements from './StatusPageAnnouncements';
import StatusPageAutoRefresh from './StatusPageAutoRefresh';
import StatusPageHeader from './StatusPageHeader';
import StatusPageIncidents from './StatusPageIncidents';
import StatusPageMetrics from './StatusPageMetrics';
import StatusPageServices from './StatusPageServices';
import StatusPageSubscribe from './StatusPageSubscribe';
import type { StatusPageSnapshot } from '@/lib/status-pages/snapshot';
import {
  createStatusPageViewModel,
  type StatusPageSnapshotPage,
} from '@/lib/status-pages/view-model';
import { toSafeStyleTagContent } from '@/lib/status-page-content';
import { computeStatusPageTheme } from '@/lib/status-page-theme';

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
  const thirtyDaysAgo = new Date(snapshot.generatedAt);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const ninetyDaysAgo = new Date(snapshot.generatedAt);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
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
            overallStatus={snapshot.status}
            branding={branding}
            lastUpdated={snapshot.generatedAt}
          />
        )}
        {stale && <p role="note">Showing the last verified status update.</p>}
        <StatusPageAnnouncements
          announcements={view.announcements.filter(item => item.type !== 'UPDATE')}
          showServiceRegions={snapshot.services.some(service => service.region !== undefined)}
        />
        {page.showRegionHeatmap === true && (
          <section aria-labelledby="region-health-heading">
            <h2 id="region-health-heading">Region health</h2>
            {Array.from(
              new Set(
                snapshot.services.flatMap(service =>
                  (service.region || '')
                    .split(',')
                    .map(region => region.trim())
                    .filter(Boolean)
                )
              )
            ).map(region => (
              <p key={region}>{region}</p>
            ))}
          </section>
        )}
        {page.showServicesByRegion === true &&
          Array.from(
            new Set(
              snapshot.services.flatMap(service =>
                (service.region || '')
                  .split(',')
                  .map(region => region.trim())
                  .filter(Boolean)
              )
            )
          ).map(region => <section key={region} aria-label={`${region} services`} />)}
        <StatusPageServices
          services={view.services}
          statusPageServices={view.mappings}
          uptime90={view.uptime}
          incidents={[]}
          statusHistory={view.statusHistory}
          groupByRegionDefault={page.showServicesByRegion}
          showServiceOwners={snapshot.services.some(service => service.team !== undefined)}
          showServiceSlaTier={snapshot.services.some(service => service.slaTier !== undefined)}
          privacySettings={{
            showServiceDescriptions: snapshot.services.some(
              service => service.description !== undefined
            ),
            showServiceRegions: snapshot.services.some(service => service.region !== undefined),
            showTeamInformation: snapshot.services.some(service => service.team !== undefined),
            showUptimeHistory: snapshot.statusHistory !== undefined,
          }}
        />
        {Object.keys(view.uptime).length > 0 && (
          <StatusPageMetrics
            services={view.services}
            incidents={[]}
            thirtyDaysAgo={thirtyDaysAgo}
            ninetyDaysAgo={ninetyDaysAgo}
            precomputedUptime={view.uptime}
            precomputedUptime30={view.uptime30}
          />
        )}
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
