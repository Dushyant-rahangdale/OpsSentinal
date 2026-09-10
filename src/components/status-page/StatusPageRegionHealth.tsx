'use client';

import type { PublicRegionStatus } from '@/lib/status-pages/public-contract';
import { statusPresentation } from '@/lib/status-pages/status-presentation';
import { describeRegion, regionBreakdown } from '@/lib/status-pages/presentation';

/**
 * Region health in plain language.
 *
 * The exhaustive per-status counters are still available, but behind a disclosure: on a healthy
 * page five of the six are always zero, and leading with them reads as a diagnostic dump rather
 * than an answer.
 */
export default function StatusPageRegionHealth({ regions }: { regions: PublicRegionStatus[] }) {
  if (regions.length === 0) return null;

  return (
    <section className="status-section" aria-labelledby="region-health-heading">
      <div className="status-section__head">
        <h2 id="region-health-heading">Region health</h2>
        <span className="status-section__count">Service health by hosting region</span>
      </div>
      <div className="status-region-grid">
        {regions.map(region => {
          const presentation = statusPresentation(region.status);
          const breakdown = regionBreakdown(region);
          return (
            <article key={region.name} className="status-region status-panel">
              <div className="status-region__head">
                <h3>{region.name}</h3>
                <span className={`status-badge status-${presentation.token}`}>
                  <span aria-hidden="true">{presentation.icon}</span> {presentation.label}
                </span>
              </div>
              <span className="status-region__summary">{describeRegion(region)}</span>
              {breakdown.length > 1 && (
                <details className="status-disclosure">
                  <summary>Breakdown</summary>
                  <div className="status-region__detail">
                    {breakdown.map(entry => (
                      <div key={entry.label}>
                        <span>{entry.label}</span>
                        <span>{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
