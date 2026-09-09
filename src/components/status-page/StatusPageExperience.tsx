'use client';

import { useEffect, useMemo, useState } from 'react';
import StatusPageAnnouncements from './StatusPageAnnouncements';
import StatusPageHeader from './StatusPageHeader';
import StatusPageIncidents from './StatusPageIncidents';
import StatusPageOverview from './StatusPageOverview';
import StatusPageRegionHealth from './StatusPageRegionHealth';
import StatusPageServiceBoard from './StatusPageServiceBoard';
import StatusPageSubscribe from './StatusPageSubscribe';
import StatusPageUptimeMetrics from './StatusPageUptimeMetrics';
import type { PublicStatusPageSnapshot } from '@/lib/status-pages/public-contract';
import {
  STATUS_PAGE_PUBLIC_CSS,
  STATUS_PAGE_SURFACE_CLASS,
} from '@/lib/status-pages/public-css';
import { createStatusPageViewModel, type StatusPageSnapshotPage } from '@/lib/status-pages/view-model';

/**
 * The public status page, in full.
 *
 * This is the only status-page UI. The live route and the admin preview both render it, differing
 * only in where the snapshot comes from -- published, or projected from unsaved settings. Keeping
 * a second renderer for either surface is what let an administrator configure and preview one
 * experience while visitors received a different, smaller one.
 *
 * It reads the published contract directly and derives nothing about health: severity, region
 * aggregates, uptime windows and history intervals are all decided server-side. What happens here
 * is presentation only -- search, filtering, grouping, and rendering the reader's local clock.
 */
export default function StatusPageExperience({
  page,
  snapshot,
  stale = false,
  styleMode = 'inline',
  subscribeEnabled = true,
}: {
  page: StatusPageSnapshotPage;
  snapshot: PublicStatusPageSnapshot;
  stale?: boolean;
  /**
   * `inline` emits the shared stylesheet with the page. `inherited` omits it, for the preview's
   * shadow root, which already carries the same text in its baseline style element.
   */
  styleMode?: 'inline' | 'inherited';
  /** Preview renders the subscribe form for layout but must not accept real subscriptions. */
  subscribeEnabled?: boolean;
}) {
  const view = useMemo(() => createStatusPageViewModel(page, snapshot), [page, snapshot]);
  const branding =
    page.branding && typeof page.branding === 'object' && !Array.isArray(page.branding)
      ? (page.branding as Record<string, unknown>)
      : {};

  // Resolved after mount: every date on this page is shown in the reader's own zone, and there is
  // deliberately no page-level timezone setting to contradict it.
  const [timeZone, setTimeZone] = useState<string | null>(null);
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  }, []);

  const notices = view.announcements.filter(item => item.type !== 'UPDATE');
  const changelog = view.announcements.filter(item => item.type === 'UPDATE');
  const activeIncidents = snapshot.incidents.filter(
    incident => incident.status !== 'RESOLVED'
  ).length;

  // Published with the snapshot, so the badge on this page grades uptime the same way the API
  // and any export do. Defaults match the column defaults for payloads written before they were.
  const thresholds = {
    excellent: snapshot.thresholds?.uptimeExcellent ?? 99.9,
    good: snapshot.thresholds?.uptimeGood ?? 99,
  };

  const incidentDisclosure = useMemo(
    () => ({
      showIncidentDetails: snapshot.incidents.some(incident => incident.id !== undefined),
      showIncidentTitles: snapshot.incidents.some(incident => incident.title !== undefined),
      showIncidentDescriptions: snapshot.incidents.some(
        incident => incident.description !== undefined
      ),
      showAffectedServices: snapshot.incidents.some(incident => incident.service !== undefined),
      showServiceRegions: snapshot.incidents.some(
        incident => incident.service?.regions !== undefined
      ),
      showIncidentTimestamps: snapshot.incidents.some(
        incident => incident.createdAt !== undefined
      ),
      showIncidentUrgency: snapshot.incidents.some(incident => incident.urgency !== undefined),
    }),
    [snapshot.incidents]
  );

  const statusPagePath =
    page.slug && !page.isDefault ? `/status/${encodeURIComponent(page.slug)}` : '/status';
  const apiPath =
    page.slug && !page.isDefault ? `/api/status/${encodeURIComponent(page.slug)}` : '/api/status';

  const showRegions = page.showRegionHeatmap === true && snapshot.regions.length > 0;
  const hasUptime = snapshot.services.some(service => service.uptime);

  return (
    <div className={STATUS_PAGE_SURFACE_CLASS}>
      {styleMode === 'inline' && <style>{STATUS_PAGE_PUBLIC_CSS}</style>}

      {branding.showHeader !== false && (
        <StatusPageHeader
          statusPage={{
            name: page.name,
            contactEmail: page.contactEmail,
            contactUrl: page.contactUrl,
          }}
          overallStatus={snapshot.overall.status}
          branding={branding}
          lastUpdated={snapshot.generatedAt}
        />
      )}

      {stale && (
        <p role="note" className="status-muted">
          Showing the last verified status update.
        </p>
      )}

      <StatusPageOverview
        snapshot={snapshot}
        activeIncidentCount={activeIncidents}
        windowIncidentCount={snapshot.incidents.length}
      />

      <StatusPageAnnouncements announcements={notices} />

      {showRegions && <StatusPageRegionHealth regions={snapshot.regions} />}

      <StatusPageServiceBoard
        services={snapshot.services}
        groupByRegion={page.showServicesByRegion === true}
        thresholds={thresholds}
        timeZone={timeZone}
      />

      {hasUptime && (
        <StatusPageUptimeMetrics services={snapshot.services} thresholds={thresholds} />
      )}

      {/* The serializer already decided what may be published, and omits the rest. These flags
          exist because the incident renderer substitutes generic fallbacks for absent fields
          ("Affected service: Service"), which would reconstruct in the UI exactly what privacy
          removed from the payload. Presence is the signal here precisely because absence is
          how the projection expresses suppression. */}
      <StatusPageIncidents
        incidents={view.incidents}
        privacySettings={incidentDisclosure}
        showPostIncidentReview={page.showPostIncidentReview}
        statusPagePath={statusPagePath}
      />

      {page.showChangelog !== false && changelog.length > 0 && (
        <section className="status-section" aria-labelledby="changelog-heading">
          <div className="status-section__head">
            <h2 id="changelog-heading">Changelog</h2>
          </div>
          <StatusPageAnnouncements announcements={changelog} />
        </section>
      )}

      {page.showSubscribe !== false && (
        <section className="status-section" aria-labelledby="subscribe-heading">
          <div className="status-section__head">
            <h2 id="subscribe-heading">Subscribe to updates</h2>
            <span className="status-section__count">
              Get notified when service status changes
            </span>
          </div>
          {subscribeEnabled ? (
            <StatusPageSubscribe statusPageId={page.id} />
          ) : (
            <p className="status-muted">
              Subscriptions are accepted on the published status page.
            </p>
          )}
        </section>
      )}

      {branding.showFooter !== false && (
        <footer className="status-footer">
          <nav className="status-footer__links" aria-label="Status resources">
            {branding.showApiLink !== false && (
              <a className="status-footer-link" href={apiPath}>
                JSON API
              </a>
            )}
            {branding.showRssLink !== false && (
              <a className="status-footer-link" href={`${apiPath}/rss`}>
                RSS
              </a>
            )}
            {page.enableUptimeExports === true && hasUptime && (
              <>
                <a className="status-footer-link" href={`${apiPath}/uptime-export?format=csv`}>
                  Uptime CSV
                </a>
                <a className="status-footer-link" href={`${apiPath}/uptime-export?format=pdf`}>
                  Uptime PDF
                </a>
              </>
            )}
            {page.contactEmail && (
              <a className="status-footer-link" href={`mailto:${page.contactEmail}`}>
                Contact
              </a>
            )}
            {page.contactUrl && (
              <a className="status-footer-link" href={page.contactUrl}>
                Support
              </a>
            )}
          </nav>
          <p className="status-muted">
            {page.footerText || (
              <span className="status-footer__brand">
                Powered by{' '}
                <a
                  className="status-footer-link"
                  href="https://opsknight.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpsKnight
                </a>
              </span>
            )}
          </p>
          <button type="button" className="status-hint" aria-describedby="status-local-time-hint">
            <span aria-hidden="true">&#9432;</span> Times shown in your local time
          </button>
          <span id="status-local-time-hint" className="sr-only">
            {timeZone
              ? `Dates and times on this page use your device time zone, ${timeZone}.`
              : 'Dates and times on this page use your device time zone.'}
          </span>
        </footer>
      )}
    </div>
  );
}
