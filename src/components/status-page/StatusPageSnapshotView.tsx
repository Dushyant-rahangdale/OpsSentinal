import type { CSSProperties } from 'react';
import StatusPageSubscribe from './StatusPageSubscribe';
import type { StatusPageSnapshot } from '@/lib/status-pages/snapshot';
import { computeStatusPageTheme } from '@/lib/status-page-theme';
import StatusPageAutoRefresh from './StatusPageAutoRefresh';
import { toSafeStyleTagContent } from '@/lib/status-page-content';

type PageView = {
  id: string;
  name: string;
  organizationName?: string | null;
  branding?: unknown;
  showSubscribe?: boolean;
  showServicesByRegion?: boolean;
  showRegionHeatmap?: boolean;
  showPostIncidentReview?: boolean;
  showChangelog?: boolean;
  enableUptimeExports?: boolean;
  footerText?: string | null;
  contactEmail?: string | null;
  contactUrl?: string | null;
  slug?: string | null;
  isDefault?: boolean;
};

type SnapshotService = StatusPageSnapshot['services'][number];

function statusLabel(status: StatusPageSnapshot['status']) {
  switch (status) {
    case 'degraded':
      return 'Degraded Performance';
    case 'maintenance':
      return 'Scheduled Maintenance';
    case 'outage':
      return 'Major Outage';
    case 'operational':
    default:
      return 'All Systems Operational';
  }
}

function serviceSeverity(status: string) {
  switch (status) {
    case 'MAJOR_OUTAGE':
      return 3;
    case 'DEGRADED':
    case 'PARTIAL_OUTAGE':
      return 2;
    case 'MAINTENANCE':
      return 1;
    case 'OPERATIONAL':
    default:
      return 0;
  }
}

function getRegions(region?: string | null) {
  if (!region) return [];
  return region
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function regionGroupKey(service: SnapshotService) {
  const regions = getRegions(service.region);
  if (regions.length === 0) return 'Global';
  if (regions.length === 1) return regions[0];
  return 'Multi-region';
}

function projectRegions(services: SnapshotService[]) {
  const groups = new Map<string, SnapshotService[]>();
  const summaries = new Map<
    string,
    { total: number; impacted: number; maintenance: number; severity: number }
  >();

  for (const service of services) {
    const groupKey = regionGroupKey(service);
    groups.set(groupKey, [...(groups.get(groupKey) || []), service]);

    const regions = getRegions(service.region);
    if (regions.length === 0) continue;
    const status = service.status || 'OPERATIONAL';
    const impacted = status !== 'OPERATIONAL' && status !== 'MAINTENANCE';
    const isMaintenance = status === 'MAINTENANCE';
    const severity = serviceSeverity(status);

    for (const region of regions) {
      const summary = summaries.get(region) || {
        total: 0,
        impacted: 0,
        maintenance: 0,
        severity: 0,
      };
      summary.total += 1;
      if (impacted) summary.impacted += 1;
      if (isMaintenance) summary.maintenance += 1;
      summary.severity = Math.max(summary.severity, severity);
      summaries.set(region, summary);
    }
  }

  const groupPriority = (region: string) => {
    if (region === 'Multi-region') return 1;
    if (region === 'Global') return 2;
    return 0;
  };

  return {
    groups: Array.from(groups.entries())
      .sort((a, b) => groupPriority(a[0]) - groupPriority(b[0]) || a[0].localeCompare(b[0]))
      .map(([region, groupedServices]) => ({ region, services: groupedServices })),
    summaries: Array.from(summaries.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([region, summary]) => ({ region, ...summary })),
  };
}

function regionHealthLabel(severity: number) {
  if (severity >= 3) return 'Outage';
  if (severity >= 2) return 'Degraded';
  if (severity >= 1) return 'Maintenance';
  return 'Operational';
}

export default function StatusPageSnapshotView({
  page,
  snapshot,
  stale,
}: {
  page: PageView;
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
  const refreshInterval =
    typeof branding.refreshInterval === 'number' ? branding.refreshInterval : 60;
  const customCss = toSafeStyleTagContent(branding.customCss);
  const layout =
    branding.layout === 'wide' || branding.layout === 'compact' ? branding.layout : 'default';
  const maxWidth = layout === 'wide' ? 1600 : layout === 'compact' ? 900 : 1280;
  const showHeader = branding.showHeader !== false;
  const showFooter = branding.showFooter !== false;
  const showChangelog = page.showChangelog !== false;
  const statusPagePath =
    page.slug && !page.isDefault ? `/status/${encodeURIComponent(page.slug)}` : '/status';
  const apiPath =
    page.slug && !page.isDefault ? `/api/status/${encodeURIComponent(page.slug)}` : '/api/status';
  const uptimeByService = new Map(Object.entries(snapshot.uptime));
  const showUptimeExports = page.enableUptimeExports === true && uptimeByService.size > 0;
  const canUseRegions = snapshot.services.some(service => getRegions(service.region).length > 0);
  const regionProjection =
    (page.showServicesByRegion === true || page.showRegionHeatmap === true) && canUseRegions
      ? projectRegions(snapshot.services)
      : { groups: [], summaries: [] };
  const groupServices = page.showServicesByRegion === true && canUseRegions;
  const showRegionHeatmap =
    page.showRegionHeatmap === true && regionProjection.summaries.length > 0;
  const announcements = snapshot.announcements.filter(item => item.type !== 'UPDATE');
  const changelog = showChangelog
    ? snapshot.announcements.filter(item => item.type === 'UPDATE')
    : [];

  const renderService = (service: SnapshotService) => {
    const uptime = uptimeByService.get(service.id);
    return (
      <article
        key={service.id}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          padding: '1rem 0',
          borderBottom: '1px solid currentColor',
        }}
      >
        <div>
          <strong>{service.name}</strong>
          {service.description && <p>{service.description}</p>}
          {service.region && <small>{service.region}</small>}
          {service.slaTier && <small> · Service tier {service.slaTier}</small>}
          {service.team && <small> · Owned by {service.team.name}</small>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span>{service.status.replaceAll('_', ' ')}</span>
          {typeof uptime === 'number' && (
            <div>
              <small>{uptime.toFixed(3)}% uptime</small>
            </div>
          )}
        </div>
      </article>
    );
  };

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
      <div style={{ maxWidth, margin: '0 auto', padding: layout === 'compact' ? '0.5rem' : 0 }}>
        {showHeader && (
          <header style={{ marginBottom: '2rem' }}>
            <p style={{ opacity: 0.7 }}>{page.organizationName || 'Service status'}</p>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', margin: 0 }}>{page.name}</h1>
            <div
              role="status"
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                border: `1px solid ${theme.primaryColor}`,
                borderRadius: 12,
              }}
            >
              <strong>{statusLabel(snapshot.status)}</strong>
              <span style={{ marginLeft: 12, opacity: 0.7 }}>
                Updated {new Date(snapshot.generatedAt).toLocaleString()}
              </span>
            </div>
            {stale && (
              <p role="note">Showing the last verified update while fresh data is being rebuilt.</p>
            )}
          </header>
        )}

        {announcements.length > 0 && (
          <section aria-labelledby="announcements-heading">
            <h2 id="announcements-heading">Announcements</h2>
            {announcements.map(item => (
              <article
                key={item.id}
                style={{ padding: '1rem 0', borderBottom: '1px solid currentColor' }}
              >
                <strong>{item.title}</strong>
                <p>{item.message}</p>
              </article>
            ))}
          </section>
        )}

        {changelog.length > 0 && (
          <section aria-labelledby="changelog-heading" style={{ marginTop: '2rem' }}>
            <h2 id="changelog-heading">Changelog</h2>
            {changelog.map(item => (
              <article
                key={item.id}
                style={{ padding: '1rem 0', borderBottom: '1px solid currentColor' }}
              >
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>{new Date(item.startDate).toLocaleString()}</small>
              </article>
            ))}
          </section>
        )}

        {showRegionHeatmap && (
          <section aria-labelledby="region-health-heading" style={{ marginTop: '2rem' }}>
            <h2 id="region-health-heading">Region health</h2>
            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              }}
            >
              {regionProjection.summaries.map(region => (
                <article
                  key={region.region}
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--status-panel-border, currentColor)',
                    borderRadius: 12,
                    background: 'var(--status-panel-bg, transparent)',
                  }}
                >
                  <strong>{region.region}</strong>
                  <div>{regionHealthLabel(region.severity)}</div>
                  <small>
                    {region.impacted} impacted · {region.maintenance} maintenance · {region.total}{' '}
                    services
                  </small>
                </article>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="services-heading" style={{ marginTop: '2rem' }}>
          <h2 id="services-heading">Services</h2>
          {snapshot.services.length === 0 ? (
            <p>No services are published on this page.</p>
          ) : groupServices ? (
            regionProjection.groups.map(group => (
              <section key={group.region} aria-label={`${group.region} services`}>
                <h3>{group.region}</h3>
                {group.services.map(renderService)}
              </section>
            ))
          ) : (
            snapshot.services.map(renderService)
          )}
        </section>

        <section aria-labelledby="incidents-heading" style={{ marginTop: '2rem' }}>
          <h2 id="incidents-heading">Recent incidents</h2>
          {snapshot.incidents.length === 0 ? (
            <p>No public incidents in the last {snapshot.historyDays} days.</p>
          ) : (
            snapshot.incidents.map((incident, index) => {
              const incidentId = typeof incident.id === 'string' ? incident.id : null;
              const showPostIncidentReview =
                page.showPostIncidentReview !== false &&
                incident.postIncidentReview === true &&
                incidentId !== null;
              return (
                <article
                  key={incidentId || index}
                  style={{ padding: '1rem 0', borderBottom: '1px solid currentColor' }}
                >
                  <strong>
                    {typeof incident.title === 'string' ? incident.title : 'Status update'}
                  </strong>
                  {typeof incident.description === 'string' && <p>{incident.description}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {typeof incident.status === 'string' && <small>{incident.status}</small>}
                    {typeof incident.urgency === 'string' && (
                      <small>{incident.urgency} urgency</small>
                    )}
                    {typeof incident.createdAt === 'string' && (
                      <small>Started {new Date(incident.createdAt).toLocaleString()}</small>
                    )}
                    {typeof incident.resolvedAt === 'string' && (
                      <small>Resolved {new Date(incident.resolvedAt).toLocaleString()}</small>
                    )}
                    {typeof (incident.service as { name?: unknown } | undefined)?.name ===
                      'string' && (
                      <small>Affected service: {(incident.service as { name: string }).name}</small>
                    )}
                    {incidentId && <small>Incident {incidentId}</small>}
                    {showPostIncidentReview && (
                      <a
                        href={`${statusPagePath}/postmortems/${encodeURIComponent(incidentId)}`}
                        style={{ color: 'var(--status-primary, currentColor)' }}
                      >
                        Post-incident review
                      </a>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>

        {page.showSubscribe !== false && (
          <section style={{ marginTop: '2rem' }}>
            <StatusPageSubscribe statusPageId={page.id} />
          </section>
        )}

        {showFooter && (
          <footer style={{ marginTop: '3rem', opacity: 0.7 }}>
            <p>{page.footerText || 'Powered by OpsKnight'}</p>
            <nav
              aria-label="Status resources"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
            >
              {branding.showApiLink !== false && <a href={apiPath}>JSON API</a>}
              {branding.showRssLink !== false && <a href={`${apiPath}/rss`}>RSS</a>}
              {showUptimeExports && (
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
