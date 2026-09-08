import { projectIncidentSlaState } from './state';
import type { IncidentSlaProjectionInput, IncidentSlaProjectionOptions } from './types';

export type IncidentSlaCompliance = {
  ack: 'MET' | 'BREACHED' | 'PENDING' | 'INVALID';
  resolve: 'MET' | 'BREACHED' | 'PENDING' | 'INVALID';
};

/** Canonical compliance classification. Never resolves mutable policy configuration. */
export function getIncidentSlaCompliance(
  input: IncidentSlaProjectionInput,
  options?: IncidentSlaProjectionOptions
): IncidentSlaCompliance {
  const state = projectIncidentSlaState(input, options);
  if (!state.valid) return { ack: 'INVALID', resolve: 'INVALID' };
  return { ack: state.ack.status, resolve: state.resolve.status };
}
