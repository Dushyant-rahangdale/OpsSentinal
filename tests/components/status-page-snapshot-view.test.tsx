import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StatusPageSnapshotView from '@/components/status-page/StatusPageSnapshotView';
import type { StatusPageSnapshot } from '@/lib/status-pages/snapshot';

vi.mock('@/components/status-page/StatusPageSubscribe', () => ({
  default: () => <div>Subscribe form</div>,
}));
vi.mock('@/components/status-page/StatusPageAutoRefresh', () => ({
  default: () => null,
}));

const snapshot: StatusPageSnapshot = {
  schemaVersion: 1,
  pageId: 'page-1',
  revision: '7',
  generatedAt: '2026-09-07T10:00:00.000Z',
  status: 'degraded',
  services: [
    {
      id: 'service-1',
      name: 'Payments',
      description: 'Payment processing',
      region: 'eu-west-1',
      slaTier: 'TIER_1',
      team: { id: 'team-1', name: 'Payments team' },
      status: 'DEGRADED',
    },
  ],
  incidents: [
    {
      id: 'incident-1',
      title: 'Elevated errors',
      description: 'Card payments are delayed.',
      status: 'OPEN',
      urgency: 'HIGH',
      createdAt: '2026-09-07T09:00:00.000Z',
      service: { name: 'Payments', region: 'eu-west-1' },
    },
  ],
  uptime: { 'service-1': 99.95 },
  announcements: [],
  historyDays: 30,
};

describe('StatusPageSnapshotView publication parity', () => {
  it('renders every field included by the canonical visibility serializer', () => {
    render(
      <StatusPageSnapshotView
        page={{ id: 'page-1', name: 'Acme status', showSubscribe: false }}
        snapshot={snapshot}
        stale={false}
      />
    );

    expect(screen.getByText('Payment processing')).toBeInTheDocument();
    expect(screen.getByText(/SLA tier TIER_1/)).toBeInTheDocument();
    expect(screen.getByText(/Owned by Payments team/)).toBeInTheDocument();
    expect(screen.getByText('Elevated errors')).toBeInTheDocument();
    expect(screen.getByText('Card payments are delayed.')).toBeInTheDocument();
    expect(screen.getByText('HIGH urgency')).toBeInTheDocument();
    expect(screen.getByText(/Started/)).toBeInTheDocument();
    expect(screen.getByText('Affected service: Payments')).toBeInTheDocument();
    expect(screen.getByText('Incident incident-1')).toBeInTheDocument();
  });

  it('does not reconstruct fields omitted by privacy projection', () => {
    render(
      <StatusPageSnapshotView
        page={{ id: 'page-1', name: 'Acme status', showSubscribe: false }}
        snapshot={{
          ...snapshot,
          incidents: [{ status: 'OPEN' }],
          services: [{ id: 'service-1', name: 'Payments', status: 'OPERATIONAL' }],
        }}
        stale={false}
      />
    );

    expect(screen.queryByText('Elevated errors')).not.toBeInTheDocument();
    expect(screen.queryByText(/Affected service/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SLA tier/)).not.toBeInTheDocument();
  });
});
