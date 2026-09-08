import { projectIncidentSlaState } from './state';
import type { IncidentSlaProjectionInput, IncidentSlaProjectionOptions } from './types';

export type IncidentSlaTransitions = {
  ackWarningAt: Date | null;
  ackBreachAt: Date | null;
  resolveWarningAt: Date | null;
  resolveBreachAt: Date | null;
  nextTransitionAt: Date | null;
};

export function getIncidentSlaTransitions(
  input: IncidentSlaProjectionInput,
  options: IncidentSlaProjectionOptions = {}
): IncidentSlaTransitions {
  const state = projectIncidentSlaState(input, options);
  if (!state.valid) {
    return {
      ackWarningAt: null,
      ackBreachAt: null,
      resolveWarningAt: null,
      resolveBreachAt: null,
      nextTransitionAt: null,
    };
  }
  const now = options.now ?? state.clock.evaluatedAt;
  const candidates = [
    state.ack.warningAt,
    state.ack.breachAt,
    state.resolve.warningAt,
    state.resolve.breachAt,
  ].filter((value): value is Date => value !== null && value > now);
  return {
    ackWarningAt: state.ack.warningAt,
    ackBreachAt: state.ack.breachAt,
    resolveWarningAt: state.resolve.warningAt,
    resolveBreachAt: state.resolve.breachAt,
    nextTransitionAt:
      candidates.length > 0
        ? new Date(Math.min(...candidates.map(candidate => candidate.getTime())))
        : null,
  };
}
