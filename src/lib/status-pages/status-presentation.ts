import type { PublicServiceStatus } from './public-contract';

const RANK: Record<PublicServiceStatus, number> = {
  UNKNOWN: -1,
  OPERATIONAL: 0,
  MAINTENANCE: 1,
  DEGRADED: 2,
  PARTIAL_OUTAGE: 3,
  MAJOR_OUTAGE: 4,
};

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
  return typeof value === 'string' && value in STATUS_PRESENTATION
    ? (value as PublicServiceStatus)
    : 'UNKNOWN';
}

export function getWorstPublicStatus(
  statuses: readonly PublicServiceStatus[]
): PublicServiceStatus {
  if (statuses.length === 0) return 'UNKNOWN';
  return statuses.reduce((worst, status) => (RANK[status] > RANK[worst] ? status : worst));
}

export function statusPresentation(status: PublicServiceStatus) {
  return STATUS_PRESENTATION[status];
}
