import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SLA_WARNING_POLICY,
  DEFAULT_INCIDENT_SLA_WARNING_POLICY,
  getIncidentSlaWarningWindowMs,
  isValidIncidentSlaWarningPolicy,
} from '@/lib/incident-sla/warning-policy';

describe('incident SLA warning policy', () => {
  it('defaults to 25 percent remaining, capped at five ACK and fifteen resolve minutes', () => {
    expect(DEFAULT_SLA_WARNING_POLICY).toEqual({
      ratio: 0.25,
      ackCeilingMs: 300_000,
      resolveCeilingMs: 900_000,
    });
    expect(DEFAULT_INCIDENT_SLA_WARNING_POLICY).toBe(DEFAULT_SLA_WARNING_POLICY);
    expect(Object.isFrozen(DEFAULT_SLA_WARNING_POLICY)).toBe(true);
  });

  it.each([
    ['ack', 60_000, 15_000],
    ['resolve', 60_000, 15_000],
    ['ack', 1_200_000, 300_000],
    ['ack', 12_000_000, 300_000],
    ['resolve', 3_600_000, 900_000],
    ['resolve', 36_000_000, 900_000],
    ['ack', 1, 0],
    ['ack', 7, 1],
  ] as const)('calculates %s window for %i target', (phase, target, expected) => {
    expect(getIncidentSlaWarningWindowMs(phase, target)).toBe(expected);
  });

  it('allows bounded custom policy and never exceeds the target', () => {
    const policy = { ratio: 0.5, ackCeilingMs: 100, resolveCeilingMs: 200 };
    expect(getIncidentSlaWarningWindowMs('ack', 1000, policy)).toBe(100);
    expect(getIncidentSlaWarningWindowMs('resolve', 1000, policy)).toBe(200);
    expect(getIncidentSlaWarningWindowMs('ack', 10, { ...policy, ratio: 1 })).toBe(10);
    expect(getIncidentSlaWarningWindowMs('ack', 10, { ...policy, ratio: 0 })).toBe(0);
    expect(getIncidentSlaWarningWindowMs('ack', 10, { ...policy, ackCeilingMs: 0 })).toBe(0);
  });

  it.each([0, -1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid target %s',
    target => {
      expect(() => getIncidentSlaWarningWindowMs('ack', target)).toThrow(RangeError);
    }
  );

  it.each([
    { ratio: -0.1 },
    { ratio: 1.1 },
    { ratio: NaN },
    { ratio: Infinity },
    { ackCeilingMs: -1 },
    { ackCeilingMs: 0.5 },
    { ackCeilingMs: NaN },
    { resolveCeilingMs: -1 },
    { resolveCeilingMs: Infinity },
    { resolveCeilingMs: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects malformed policy %#', overrides => {
    const policy = { ...DEFAULT_SLA_WARNING_POLICY, ...overrides };
    expect(isValidIncidentSlaWarningPolicy(policy)).toBe(false);
    expect(() => getIncidentSlaWarningWindowMs('ack', 1000, policy)).toThrow(RangeError);
  });
});
