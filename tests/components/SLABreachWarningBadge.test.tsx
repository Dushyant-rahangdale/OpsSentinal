import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SLABreachWarningBadge from '@/components/incident/SLABreachWarningBadge';
import { projectIncidentSlaState } from '@/lib/incident-sla/state';

const base = {
  status: 'OPEN' as const,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  acknowledgedAt: null,
  resolvedAt: null,
  slaAckTargetMs: 15 * 60_000,
  slaResolveTargetMs: 120 * 60_000,
  slaTargetSource: 'SERVICE_DEFAULT',
  slaTargetCapturedAt: new Date('2025-01-01T00:00:00.000Z'),
  slaPausedMs: 0,
  slaPauseStartedAt: null,
  slaAckElapsedMs: null,
  slaResolveElapsedMs: null,
};

describe('SLABreachWarningBadge', () => {
  it('renders an immutable-contract breach', () => {
    const state = projectIncidentSlaState(base, { now: new Date('2025-01-01T05:00:00.000Z') });
    render(<SLABreachWarningBadge state={state} />);
    expect(screen.getByText('ACK breached')).toBeDefined();
  });

  it('renders warning from the canonical projector', () => {
    const state = projectIncidentSlaState(base, { now: new Date('2025-01-01T00:12:00.000Z') });
    render(<SLABreachWarningBadge state={state} />);
    expect(screen.getByText('3m to ACK')).toBeDefined();
  });

  it('does not derive state from mutable service configuration', () => {
    const state = projectIncidentSlaState(
      { ...base, slaAckTargetMs: 30 * 60_000 },
      { now: new Date('2025-01-01T00:20:00.000Z') }
    );
    render(<SLABreachWarningBadge state={state} />);
    expect(screen.queryByText('ACK breached')).toBeNull();
  });
});
