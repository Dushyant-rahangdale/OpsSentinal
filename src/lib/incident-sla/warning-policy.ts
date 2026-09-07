import type { IncidentSlaPhase, IncidentSlaWarningPolicy } from './types';

export const DEFAULT_SLA_WARNING_POLICY: Readonly<IncidentSlaWarningPolicy> = Object.freeze({
  ratio: 0.25,
  ackCeilingMs: 5 * 60_000,
  resolveCeilingMs: 15 * 60_000,
});

export const DEFAULT_INCIDENT_SLA_WARNING_POLICY = DEFAULT_SLA_WARNING_POLICY;

export function isValidIncidentSlaWarningPolicy(policy: IncidentSlaWarningPolicy): boolean {
  return (
    policy !== null &&
    typeof policy === 'object' &&
    Number.isFinite(policy.ratio) &&
    policy.ratio >= 0 &&
    policy.ratio <= 1 &&
    Number.isSafeInteger(policy.ackCeilingMs) &&
    policy.ackCeilingMs >= 0 &&
    Number.isSafeInteger(policy.resolveCeilingMs) &&
    policy.resolveCeilingMs >= 0
  );
}

/** Integer-millisecond window, capped independently for ACK and resolution. */
export function getIncidentSlaWarningWindowMs(
  phase: IncidentSlaPhase,
  targetMs: number,
  policy: IncidentSlaWarningPolicy = DEFAULT_SLA_WARNING_POLICY
): number {
  if (!Number.isSafeInteger(targetMs) || targetMs <= 0) {
    throw new RangeError('SLA target must be a positive safe integer in milliseconds');
  }
  if (!isValidIncidentSlaWarningPolicy(policy)) {
    throw new RangeError('Invalid SLA warning policy');
  }
  const ceiling = phase === 'ack' ? policy.ackCeilingMs : policy.resolveCeilingMs;
  // Floor the remaining-time window so warnings never start earlier than the ratio.
  return Math.floor(Math.min(targetMs * policy.ratio, ceiling));
}
