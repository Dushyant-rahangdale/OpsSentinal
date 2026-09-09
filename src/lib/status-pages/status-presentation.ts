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
