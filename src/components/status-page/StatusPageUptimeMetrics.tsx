'use client';

import type { PublicStatusService } from '@/lib/status-pages/public-contract';
import {
  describeUptimeWindow,
  UPTIME_TIER_LABEL,
  uptimeTier,
} from '@/lib/status-pages/presentation';

const WINDOWS = [
  { key: 'days30', label: '30 days' },
  { key: 'days90', label: '90 days' },
] as const;

/**
 * Availability against the page's own SLA thresholds.
 *
 * A short measurement window reports its percentage and says how many days it covers, rather than
 * claiming the figure is unavailable: twenty days of real data is data.
 */
export default function StatusPageUptimeMetrics({
  services,
  thresholds,
}: {
  services: PublicStatusService[];
  thresholds: { excellent: number; good: number };
}) {
  const measured = services.filter(service => service.uptime);
  if (measured.length === 0) return null;

  return (
    <section className="status-section" aria-labelledby="uptime-metrics-heading">
      <div className="status-section__head">
        <h2 id="uptime-metrics-heading">Uptime metrics</h2>
        <span className="status-section__count">Service availability over time</span>
      </div>
      <div className="status-uptime-grid">
        {measured.map(service => {
          // The headline badge reflects the longer window, which is the one an SLA is written against.
          const tier = uptimeTier(service.uptime?.days90, thresholds);
          return (
            <article key={service.id} className="status-uptime-card status-panel">
              <div className="status-uptime-card__head">
                <h3 className="status-service__name">{service.name}</h3>
                <span className={`status-tag`}>{UPTIME_TIER_LABEL[tier]}</span>
              </div>
              {WINDOWS.map(({ key, label }) => {
                const window = service.uptime?.[key];
                const described = describeUptimeWindow(window);
                return (
                  <div key={key} className="status-uptime-window">
                    <div className="status-uptime-window__row">
                      <span>{label}</span>
                      <span className="status-uptime-window__value">{described.value}</span>
                    </div>
                    <div
                      className="status-meter"
                      data-tier={uptimeTier(window, thresholds)}
                      role="img"
                      aria-label={`${service.name} ${label} availability ${described.value}`}
                    >
                      <span style={{ width: `${described.meterPercent}%` }} />
                    </div>
                    <span className="status-muted">
                      {window
                        ? `${window.incidentCount} ${window.incidentCount === 1 ? 'incident' : 'incidents'}`
                        : 'No data'}
                      {described.coverage ? ` · ${described.coverage}` : ''}
                      {described.partial ? ' · Partial history' : ''}
                    </span>
                  </div>
                );
              })}
            </article>
          );
        })}
      </div>
    </section>
  );
}
