'use client';

import { useSyncExternalStore } from 'react';
import {
  projectIncidentSlaState,
  type IncidentSlaProjectionInput,
  type IncidentSlaState,
} from '@/lib/incident-sla/state';

/** Accept both RSC Dates and dates serialized by JSON list endpoints. */
export type IncidentSlaClientInput = Partial<
  Omit<
    IncidentSlaProjectionInput,
    'createdAt' | 'acknowledgedAt' | 'resolvedAt' | 'slaPauseStartedAt' | 'slaTargetCapturedAt'
  >
> & {
  createdAt: Date | string;
  acknowledgedAt: Date | string | null;
  resolvedAt: Date | string | null;
  slaPauseStartedAt: Date | string | null;
  slaTargetCapturedAt: Date | string | null;
  slaPausedMs?: bigint | number;
};

const asDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));
const nullableDate = (value: Date | string | null) => (value == null ? null : asDate(value));

export function normalizeIncidentSlaInput(
  input: IncidentSlaClientInput
): IncidentSlaProjectionInput {
  return {
    ...input,
    status: input.status ?? 'OPEN',
    createdAt: asDate(input.createdAt),
    acknowledgedAt: nullableDate(input.acknowledgedAt),
    resolvedAt: nullableDate(input.resolvedAt),
    slaPauseStartedAt: nullableDate(input.slaPauseStartedAt),
    slaTargetCapturedAt: nullableDate(input.slaTargetCapturedAt),
    slaPausedMs: input.slaPausedMs ?? 0,
    slaAckTargetMs: input.slaAckTargetMs ?? null,
    slaResolveTargetMs: input.slaResolveTargetMs ?? null,
    slaTargetSource: input.slaTargetSource ?? null,
    slaAckElapsedMs: input.slaAckElapsedMs ?? null,
    slaResolveElapsedMs: input.slaResolveElapsedMs ?? null,
  };
}

// One clock for the entire client, regardless of list length. No timers during SSR.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let snapshot: number | null = null;
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === undefined) {
    snapshot = Date.now();
    timer = setInterval(() => {
      snapshot = Date.now();
      listeners.forEach(notify => notify());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
      snapshot = null;
    }
  };
}

/** The optional server projection keeps SSR and initial hydration identical. */
export function useIncidentSlaState(
  input: IncidentSlaClientInput,
  initialState?: IncidentSlaState
): IncidentSlaState | null {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (now === null) return initialState ?? null;
  // Deliberately do not memoize by id/status: pause and captured measurement updates matter.
  return projectIncidentSlaState(normalizeIncidentSlaInput(input), { now: new Date(now) });
}
