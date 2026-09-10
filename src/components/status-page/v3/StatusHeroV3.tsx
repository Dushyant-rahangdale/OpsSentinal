import type { PublicStatusPageSnapshot } from '@/lib/status-pages/public-contract';
import { statusPresentation } from '@/lib/status-pages/status-presentation';
import StatusBadgeV3 from './StatusBadgeV3';

/**
 * Hero summary rendered entirely from the V3 `overall` block ΓÇö no counting or severity logic here,
 * every figure is supplied by the projector.
 */
export default function StatusHeroV3({
  overall,
  updatedLabel,
}: {
  overall: PublicStatusPageSnapshot['overall'];
  updatedLabel?: string | null;
}) {
  const token = statusPresentation(overall.status).token;
  const stats: Array<{ label: string; value: number | undefined; hint?: string }> = [
    {
      label: 'Services',
      value: overall.totalServiceCount,
      hint:
        overall.impactedServiceCount != null
          ? `${overall.impactedServiceCount} affected`
          : undefined,
    },
    { label: 'Active incidents', value: overall.activeIncidentCount },
    { label: 'In maintenance', value: overall.maintenanceCount },
  ];

  return (
    <section
      className="status-v3-hero status-panel"
      data-status={token}
      aria-labelledby="status-v3-hero-heading"
    >
      <div className="status-v3-hero__banner">
        <span className="status-v3-hero__mark">
          <span className={`status-v3-dot status-v3-dot--lg status-${token}`} aria-hidden="true" />
          <StatusBadgeV3 status={overall.status} />
        </span>
        <h1 id="status-v3-hero-heading" aria-live="polite">
          {overall.headline}
        </h1>
        {updatedLabel && (
          <span className="status-muted" suppressHydrationWarning>
            Updated {updatedLabel}
          </span>
        )}
        {overall.note && <p className="status-v3-hero__note">{overall.note}</p>}
        {overall.confidence !== 'complete' && (
          <p className="status-v3-hero__confidence">
            {overall.unknownServiceCount} of{' '}
            {overall.knownServiceCount + overall.unknownServiceCount} services unverified
          </p>
        )}
      </div>
      <dl className="status-v3-hero__stats">
        {stats
          .filter(stat => stat.value != null)
          .map(stat => (
            <div key={stat.label} className="status-stat">
              <dt className="status-stat__label">{stat.label}</dt>
              <dd className="status-stat__value">{stat.value}</dd>
              {stat.hint && <dd className="status-stat__hint">{stat.hint}</dd>}
            </div>
          ))}
      </dl>
    </section>
  );
}
