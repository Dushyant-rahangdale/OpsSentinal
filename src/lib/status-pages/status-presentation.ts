import type { PublicServiceStatus } from './public-contract';

/** Canonical product policy for projecting incident urgency onto every public status surface. */
export function publicStatusForIncidentUrgency(urgency: string): PublicServiceStatus {
  switch (urgency) {
    case 'LOW': return 'DEGRADED';
    case 'MEDIUM': return 'PARTIAL_OUTAGE';
    case 'HIGH': return 'MAJOR_OUTAGE';
    default: return 'UNKNOWN';
  }
}

function statusRank(status: PublicServiceStatus): number {
  switch (status) {
    case 'OPERATIONAL': return 0;
    case 'UNKNOWN': return 1;
    case 'MAINTENANCE': return 2;
    case 'DEGRADED': return 3;
    case 'PARTIAL_OUTAGE': return 4;
    case 'MAJOR_OUTAGE': return 5;
  }
}

export const STATUS_PRESENTATION: Record<
  PublicServiceStatus,
  { label: string; token: string; icon: string }
> = {
  OPERATIONAL: { label: 'Operational', token: 'operational', icon: '✓' },
  DEGRADED: { label: 'Degraded', token: 'degraded', icon: '⚠' },
  MAINTENANCE: { label: 'Maintenance', token: 'maintenance', icon: '⚙' },
  PARTIAL_OUTAGE: { label: 'Partial outage', token: 'partial-outage', icon: '◐' },
  MAJOR_OUTAGE: { label: 'Major outage', token: 'major-outage', icon: '✕' },
  UNKNOWN: { label: 'Status unknown', token: 'unknown', icon: '?' },
};

export function normalizePublicStatus(value: unknown): PublicServiceStatus {
  switch (value) {
    case 'OPERATIONAL': case 'DEGRADED': case 'MAINTENANCE':
    case 'PARTIAL_OUTAGE': case 'MAJOR_OUTAGE': case 'UNKNOWN': return value;
    default: return 'UNKNOWN';
  }
}

export function getWorstPublicStatus(
  statuses: readonly PublicServiceStatus[]
): PublicServiceStatus {
  if (statuses.length === 0) return 'UNKNOWN';
  return statuses.reduce((worst, status) => (
    statusRank(status) > statusRank(worst) ? status : worst
  ));
}

/** Worst status among services we actually have a signal for. */
export function worstKnownPublicStatus(
  statuses: readonly PublicServiceStatus[]
): PublicServiceStatus | null {
  const known = statuses.filter(status => status !== 'UNKNOWN');
  return known.length === 0 ? null : getWorstPublicStatus(known);
}

/** How much of the picture we can actually vouch for. */
export type PublicHealthConfidence = 'complete' | 'partial' | 'none';

export type OverallPublicHealth = {
  status: PublicServiceStatus;
  knownServiceCount: number;
  unknownServiceCount: number;
  confidence: PublicHealthConfidence;
  /** Primary line for the page header. */
  headline: string;
  /** Secondary caveat, present only when some services could not be verified. */
  note: string | null;
};

/**
 * Summarize a page's services, keeping health and data confidence separate.
 *
 * Ranking UNKNOWN as a severity makes a single unverifiable service dominate an otherwise healthy
 * page, which overstates the problem; ignoring it understates one. Neither is acceptable, so
 * severity is computed from the services we have a signal for and missing signal is reported
 * alongside it as a caveat. Two invariants follow, and are asserted in the tests: adding UNKNOWN
 * services can never reduce the reported severity, and a page with no signal at all never reports
 * itself operational.
 */
export function deriveOverallPublicHealth(
  services: ReadonlyArray<{ status: PublicServiceStatus }>
): OverallPublicHealth {
  const statuses = services.map(service => service.status);
  const unknownServiceCount = statuses.filter(status => status === 'UNKNOWN').length;
  const knownServiceCount = statuses.length - unknownServiceCount;

  if (statuses.length === 0) {
    return {
      status: 'OPERATIONAL',
      knownServiceCount: 0,
      unknownServiceCount: 0,
      confidence: 'complete',
      headline: 'No services published',
      note: null,
    };
  }

  if (knownServiceCount === 0) {
    return {
      status: 'UNKNOWN',
      knownServiceCount: 0,
      unknownServiceCount,
      confidence: 'none',
      headline: 'Current status unavailable',
      note: 'We could not verify service health just now. This page refreshes automatically.',
    };
  }

  const worst = worstKnownPublicStatus(statuses) ?? 'OPERATIONAL';
  const plural = unknownServiceCount === 1 ? 'service' : 'services';
  return {
    status: worst,
    knownServiceCount,
    unknownServiceCount,
    confidence: unknownServiceCount === 0 ? 'complete' : 'partial',
    headline:
      worst === 'OPERATIONAL'
        ? unknownServiceCount === 0
          ? `All ${knownServiceCount} ${knownServiceCount === 1 ? 'service' : 'services'} operational`
          : 'All known systems operational'
        : OVERALL_HEADLINE[worst],
    note:
      unknownServiceCount === 0
        ? null
        : `Status unavailable for ${unknownServiceCount} additional ${plural}.`,
  };
}

/**
 * Header copy per status. Partial and major outage stay distinct: collapsing them into a generic
 * "Outage" hides the difference between some functionality being unavailable and most of it.
 */
export const OVERALL_HEADLINE: Record<PublicServiceStatus, string> = {
  OPERATIONAL: 'All systems operational',
  MAINTENANCE: 'Scheduled maintenance',
  DEGRADED: 'Degraded performance',
  PARTIAL_OUTAGE: 'Partial outage',
  MAJOR_OUTAGE: 'Major outage',
  UNKNOWN: 'Status information unavailable',
};

/**
 * The four-value vocabulary the public API used before partial outage and unknown existed.
 *
 * Emitted alongside the canonical value so an integrator switching on the old set keeps working:
 * PARTIAL_OUTAGE and MAJOR_OUTAGE both fold to `outage`, and UNKNOWN folds to `degraded` because
 * "we cannot verify this" must never be reported to an existing consumer as healthy.
 */
export type LegacyPublicStatus = 'operational' | 'degraded' | 'maintenance' | 'outage';

export function legacyPublicStatus(status: PublicServiceStatus): LegacyPublicStatus {
  switch (status) {
    case 'OPERATIONAL':
      return 'operational';
    case 'MAINTENANCE':
      return 'maintenance';
    case 'PARTIAL_OUTAGE':
    case 'MAJOR_OUTAGE':
      return 'outage';
    case 'DEGRADED':
    case 'UNKNOWN':
      return 'degraded';
  }
}

/** Supporting sentence under the headline. */
export const OVERALL_DETAIL: Record<PublicServiceStatus, string> = {
  OPERATIONAL: 'All services are operating normally.',
  MAINTENANCE: 'Planned maintenance is currently in progress.',
  DEGRADED: 'Some services are experiencing reduced performance.',
  PARTIAL_OUTAGE: 'Some services are currently unavailable.',
  MAJOR_OUTAGE: 'Multiple services are experiencing disruption.',
  UNKNOWN: "We can't currently verify service health.",
};

export function statusPresentation(status: PublicServiceStatus) {
  switch (status) {
    case 'OPERATIONAL': return STATUS_PRESENTATION.OPERATIONAL;
    case 'DEGRADED': return STATUS_PRESENTATION.DEGRADED;
    case 'MAINTENANCE': return STATUS_PRESENTATION.MAINTENANCE;
    case 'PARTIAL_OUTAGE': return STATUS_PRESENTATION.PARTIAL_OUTAGE;
    case 'MAJOR_OUTAGE': return STATUS_PRESENTATION.MAJOR_OUTAGE;
    case 'UNKNOWN': return STATUS_PRESENTATION.UNKNOWN;
  }
}
