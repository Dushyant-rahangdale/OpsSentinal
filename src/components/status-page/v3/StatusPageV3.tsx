'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/timezone';
import type { PublicStatusPageSnapshot } from '@/lib/status-pages/public-contract';
import StatusHeroV3 from './StatusHeroV3';
import ServiceHealthV3 from './ServiceHealthV3';
import RegionHealthV3 from './RegionHealthV3';
import MaintenanceV3 from './MaintenanceV3';
import IncidentsV3 from './IncidentsV3';
import AnnouncementsV3 from './AnnouncementsV3';

/**
 * V3-native status page: presentation only.
 *
 * Every value comes from the sanitized V3 snapshot; there is no uptime, severity, region or
 * disclosure calculation in this tree. Swapping the legacy experience for this is PR 9's job ΓÇö this
 * component is additive so it can be adopted without removing anything first.
 */
export default function StatusPageV3({
  snapshot,
  postmortemHref,
}: {
  snapshot: PublicStatusPageSnapshot;
  postmortemHref?: (postmortemId: string) => string;
}) {
  // Resolve the viewer's own timezone client-side so history and timestamps match their clock.
  const [timeZone, setTimeZone] = useState('UTC');
  const [updatedLabel, setUpdatedLabel] = useState<string | null>(null);
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setTimeZone(tz);
    setUpdatedLabel(formatDateTime(snapshot.generatedAt, tz, { format: 'short', hour12: true }));
  }, [snapshot.generatedAt]);

  // Snapshots published before section visibility existed fall back to the page's own flags.
  const visibility = snapshot.page.visibility ?? {
    services: true,
    incidents: true,
    metrics: true,
    uptime: true,
    regions: true,
    changelog: snapshot.page.showChangelog !== false,
    subscribe: snapshot.page.showSubscribe !== false,
  };
  const showServices = visibility.services !== false;
  const showRegions = visibility.regions !== false && snapshot.page.showRegionHeatmap === true;
  const showIncidents = visibility.incidents !== false;
  const showChangelog = visibility.changelog !== false;

  return (
    <div className="status-v3">
      <StatusHeroV3 overall={snapshot.overall} updatedLabel={updatedLabel} />
      <MaintenanceV3 maintenance={snapshot.maintenance} timeZone={timeZone} />
      {showServices && (
        <ServiceHealthV3
          services={snapshot.services}
          timeZone={timeZone}
          groupByRegion={snapshot.page.showServicesByRegion === true}
          thresholds={snapshot.thresholds}
        />
      )}
      {showRegions && <RegionHealthV3 regions={snapshot.regions} />}
      {showIncidents && (
        <IncidentsV3
          incidents={snapshot.incidents}
          timeZone={timeZone}
          postmortemHref={postmortemHref}
        />
      )}
      <AnnouncementsV3
        announcements={snapshot.announcements}
        changelog={showChangelog ? snapshot.changelog : undefined}
        timeZone={timeZone}
      />
    </div>
  );
}
