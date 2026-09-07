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
  footerText?: string | null;
  contactEmail?: string | null;
  contactUrl?: string | null;
  slug?: string | null;
  isDefault?: boolean;
};

const labels = {
  operational: 'All Systems Operational',
  degraded: 'Degraded Performance',
  maintenance: 'Scheduled Maintenance',
  outage: 'Major Outage',
} as const;

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
  });
  const refreshInterval =
    typeof branding.refreshInterval === 'number' ? branding.refreshInterval : 60;
  const customCss = toSafeStyleTagContent(branding.customCss);
  const apiPath =
    page.slug && !page.isDefault ? `/api/status/${encodeURIComponent(page.slug)}` : '/api/status';
  return (
    <main
      className="status-page-container"
      style={{
        minHeight: '100vh',
        background: theme.backgroundColor,
        color: theme.textColor,
        padding: 'clamp(1rem, 4vw, 3rem)',
      }}
    >
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {branding.autoRefresh !== false && (
        <StatusPageAutoRefresh enabled intervalSeconds={Math.max(30, refreshInterval)} />
      )}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
            <strong>{labels[snapshot.status]}</strong>
            <span style={{ marginLeft: 12, opacity: 0.7 }}>
              Updated {new Date(snapshot.generatedAt).toLocaleString()}
            </span>
          </div>
          {stale && (
            <p role="note">Showing the last verified update while fresh data is being rebuilt.</p>
          )}
        </header>

        {snapshot.announcements.length > 0 && (
          <section aria-labelledby="announcements-heading">
            <h2 id="announcements-heading">Announcements</h2>
            {snapshot.announcements.map(item => (
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

        <section aria-labelledby="services-heading" style={{ marginTop: '2rem' }}>
          <h2 id="services-heading">Services</h2>
          {snapshot.services.length === 0 ? (
            <p>No services are published on this page.</p>
          ) : (
            snapshot.services.map(service => (
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
                  {service.slaTier && <small> · SLA tier {service.slaTier}</small>}
                  {service.team && <small> · Owned by {service.team.name}</small>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span>{service.status.replaceAll('_', ' ')}</span>
                  {typeof snapshot.uptime[service.id] === 'number' && (
                    <div>
                      <small>{snapshot.uptime[service.id].toFixed(3)}% uptime</small>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </section>

        <section aria-labelledby="incidents-heading" style={{ marginTop: '2rem' }}>
          <h2 id="incidents-heading">Recent incidents</h2>
          {snapshot.incidents.length === 0 ? (
            <p>No public incidents in the last {snapshot.historyDays} days.</p>
          ) : (
            snapshot.incidents.map((incident, index) => (
              <article
                key={typeof incident.id === 'string' ? incident.id : index}
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
                  {typeof incident.id === 'string' && <small>Incident {incident.id}</small>}
                </div>
              </article>
            ))
          )}
        </section>

        {page.showSubscribe !== false && (
          <section style={{ marginTop: '2rem' }}>
            <StatusPageSubscribe statusPageId={page.id} />
          </section>
        )}
        <footer style={{ marginTop: '3rem', opacity: 0.7 }}>
          <p>{page.footerText || 'Powered by OpsKnight'}</p>
          <nav aria-label="Status resources" style={{ display: 'flex', gap: 12 }}>
            {branding.showApiLink !== false && <a href={apiPath}>JSON API</a>}
            {branding.showRssLink !== false && <a href={`${apiPath}/rss`}>RSS</a>}
            {page.contactEmail && <a href={`mailto:${page.contactEmail}`}>Contact</a>}
            {page.contactUrl && <a href={page.contactUrl}>Support</a>}
          </nav>
        </footer>
      </div>
    </main>
  );
}
