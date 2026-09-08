import { describe, expect, it } from 'vitest';
import { getIncidentSlaCompliance } from '@/lib/incident-sla/compliance';
import { getIncidentSlaTransitions } from '@/lib/incident-sla/deadlines';
import type { IncidentSlaProjectionInput } from '@/lib/incident-sla/types';

const minute = 60_000;
const createdAt = new Date('2026-09-08T00:00:00.000Z');
const base: IncidentSlaProjectionInput = {
  status: 'OPEN',
  createdAt,
  acknowledgedAt: null,
  resolvedAt: null,
  slaAckTargetMs: 5 * minute,
  slaResolveTargetMs: 120 * minute,
  slaTargetSource: 'SERVICE_DEFAULT',
  slaTargetCapturedAt: createdAt,
  slaPausedMs: BigInt(0),
  slaPauseStartedAt: null,
  slaAckElapsedMs: null,
  slaResolveElapsedMs: null,
};

describe('canonical SLA transitions', () => {
  it('selects a short ACK warning before a later resolution warning', () => {
    const now = new Date(createdAt.getTime() + 3 * minute);
    const transitions = getIncidentSlaTransitions(base, { now });
    expect(transitions.ackWarningAt).not.toBeNull();
    expect(transitions.nextTransitionAt).toEqual(transitions.ackWarningAt);
  });

  it('does not schedule ACK after acknowledgement', () => {
    const transitions = getIncidentSlaTransitions(
      { ...base, status: 'ACKNOWLEDGED', acknowledgedAt: new Date(createdAt.getTime() + minute) },
      { now: new Date(createdAt.getTime() + 2 * minute) }
    );
    expect(transitions.ackWarningAt).toBeNull();
    expect(transitions.ackBreachAt).toBeNull();
    expect(transitions.nextTransitionAt).toEqual(transitions.resolveWarningAt);
  });

  it('has no running transition while paused and shifts it after the pause closes', () => {
    const paused = getIncidentSlaTransitions(
      {
        ...base,
        status: 'SNOOZED',
        slaPauseStartedAt: new Date(createdAt.getTime() + minute),
      },
      { now: new Date(createdAt.getTime() + 10 * minute) }
    );
    expect(paused.nextTransitionAt).toBeNull();

    const resumed = getIncidentSlaTransitions(
      { ...base, slaPausedMs: BigInt(9 * minute) },
      { now: new Date(createdAt.getTime() + 10 * minute) }
    );
    expect(resumed.ackBreachAt).toEqual(new Date(createdAt.getTime() + 14 * minute + 1));
  });

  it('classifies resolved without ACK as breached', () => {
    expect(
      getIncidentSlaCompliance(
        { ...base, status: 'RESOLVED', resolvedAt: new Date(createdAt.getTime() + minute) },
        { now: new Date(createdAt.getTime() + 2 * minute) }
      ).ack
    ).toBe('BREACHED');
  });
});
