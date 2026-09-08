import { describe, expect, it } from 'vitest';
import { projectIncidentSlaState, type IncidentSlaProjectionInput } from '@/lib/incident-sla/state';

const origin = new Date('2026-01-01T00:00:00.000Z');
const at = (ms: number) => new Date(origin.getTime() + ms);
const row: IncidentSlaProjectionInput = {
  status: 'OPEN',
  createdAt: origin,
  acknowledgedAt: null,
  resolvedAt: null,
  slaAckTargetMs: 1000,
  slaResolveTargetMs: 1000,
  slaTargetSource: 'default',
  slaTargetCapturedAt: origin,
  slaPausedMs: 0,
  slaPauseStartedAt: null,
  slaAckElapsedMs: null,
  slaResolveElapsedMs: null,
};

describe('SLA integer-millisecond boundaries', () => {
  it.each([
    [0, 'PENDING', 'NONE', 0],
    [749, 'PENDING', 'NONE', 0.749],
    [750, 'PENDING', 'APPROACHING', 0.75],
    [999, 'PENDING', 'APPROACHING', 0.999],
    [1000, 'PENDING', 'APPROACHING', 1],
    [1001, 'BREACHED', 'BREACHED', 1],
    [2000, 'BREACHED', 'BREACHED', 1],
  ])('at elapsed %i unfinished phases are %s with %s', (elapsed, status, warning, progress) => {
    const result = projectIncidentSlaState(row, { now: at(elapsed as number) });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    for (const phase of [result.ack, result.resolve]) {
      expect(phase.status).toBe(status);
      expect(phase.warning).toBe(warning);
      expect(phase.progress).toBe(progress);
      expect(phase.remainingMs).toBe(1000 - (elapsed as number));
      expect(phase.warningAt).toEqual(at(750));
      expect(phase.breachAt).toEqual(at(1001));
    }
  });

  it.each([999, 1000, 1001])('completed phases preserve compliance at %i ms', elapsed => {
    const result = projectIncidentSlaState(
      {
        ...row,
        status: 'RESOLVED',
        acknowledgedAt: at(elapsed),
        resolvedAt: at(elapsed),
      },
      { now: at(10_000) }
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    for (const phase of [result.ack, result.resolve]) {
      expect(phase.status).toBe(elapsed > 1000 ? 'BREACHED' : 'MET');
      expect(phase.warning).toBe('NONE');
      expect(phase.warningAt).toBeNull();
      expect(phase.breachAt).toBeNull();
      expect(phase.completedAt).toEqual(at(elapsed));
    }
  });

  it('handles a one-millisecond target without premature warnings', () => {
    const tiny = { ...row, slaAckTargetMs: 1 };
    for (const [elapsed, warning] of [
      [0, 'NONE'],
      [1, 'APPROACHING'],
      [2, 'BREACHED'],
    ] as const) {
      const result = projectIncidentSlaState(tiny, { now: at(elapsed) });
      if (!result.valid) throw new Error(result.reason);
      expect(result.ack.warning).toBe(warning);
      expect(result.ack.warningAt).toEqual(at(1));
      expect(result.ack.breachAt).toEqual(at(2));
    }
  });

  it('supports zero and full-target warning windows', () => {
    for (const ratio of [0, 1]) {
      const result = projectIncidentSlaState(row, {
        now: origin,
        warningPolicy: { ratio, ackCeilingMs: 1000, resolveCeilingMs: 1000 },
      });
      if (!result.valid) throw new Error(result.reason);
      expect(result.ack.warning).toBe(ratio === 0 ? 'NONE' : 'APPROACHING');
      expect(result.ack.warningAt).toEqual(at(ratio === 0 ? 1000 : 0));
    }
  });
});
