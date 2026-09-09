import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusPageExperience from '@/components/status-page/StatusPageExperience';
import type {
  PublicStatusPageSnapshot,
  PublicStatusService,
} from '@/lib/status-pages/public-contract';
import { deriveOverallPublicHealth } from '@/lib/status-pages/status-presentation';
import { aggregatePublicRegions } from '@/lib/status-pages/history';

vi.mock('@/components/status-page/StatusPageSubscribe', () => ({ default: () => null }));

const service = (over: Partial<PublicStatusService> = {}): PublicStatusService => ({
  id: 'svc-1',
  name: 'Checkout API',
  status: 'OPERATIONAL',
  activeIncidentCount: 0,
  ...over,
});

function snapshotOf(services: PublicStatusService[], over: Partial<PublicStatusPageSnapshot> = {}) {
  return {
    schemaVersion: 3,
    pageId: 'page-1',
    revision: '4',
    generatedAt: '2026-09-09T18:00:00.000Z',
    page: {
      id: 'page-1',
      name: 'Acme status',
      showSubscribe: false,
      showServicesByRegion: false,
      showRegionHeatmap: false,
      showPostIncidentReview: false,
      showChangelog: true,
      enableUptimeExports: false,
      isDefault: true,
      requireAuth: false,
      enabled: true,
      statusApiRequireToken: false,
      statusApiRateLimitEnabled: false,
      statusApiRateLimitMax: 120,
      statusApiRateLimitWindowSec: 60,
    },
    status: 'OPERATIONAL',
    overall: deriveOverallPublicHealth(services),
    thresholds: { uptimeExcellent: 99.9, uptimeGood: 99 },
    services,
    regions: aggregatePublicRegions(services),
    incidents: [],
    announcements: [],
    historyDays: 90,
    ...over,
  } as PublicStatusPageSnapshot;
}

const page = { id: 'page-1', name: 'Acme status', showSubscribe: false };

describe('StatusPageExperience', () => {
  it('summarises the page for a reader at a glance', () => {
    render(
      <StatusPageExperience
        page={page}
        snapshot={snapshotOf([service(), service({ id: 'svc-2', name: 'Payments' })])}
      />
    );
    expect(screen.getByText('All 2 services operational')).toBeInTheDocument();
    expect(screen.getByText('None affected')).toBeInTheDocument();
  });

  it('keeps a real outage visible while flagging unverified services', () => {
    render(
      <StatusPageExperience
        page={page}
        snapshot={snapshotOf([
          service({ status: 'MAJOR_OUTAGE' }),
          service({ id: 'svc-2', name: 'Search', status: 'UNKNOWN' }),
        ])}
      />
    );
    // Scoped to the overview heading: the affected service's own badge says this too, which is
    // correct rather than duplication.
    expect(screen.getByRole('heading', { name: 'Major outage' })).toBeInTheDocument();
    expect(screen.getByText(/Status unavailable for 1 additional service/)).toBeInTheDocument();
  });

  it('distinguishes partial from major outage', () => {
    render(
      <StatusPageExperience page={page} snapshot={snapshotOf([service({ status: 'PARTIAL_OUTAGE' })])} />
    );
    expect(screen.getByRole('heading', { name: 'Partial outage' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Major outage' })).not.toBeInTheDocument();
  });

  it('filters services by search term', () => {
    render(
      <StatusPageExperience
        page={page}
        snapshot={snapshotOf([service(), service({ id: 'svc-2', name: 'Payments' })])}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Search services'), {
      target: { value: 'payments' },
    });
    expect(screen.getByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Checkout API' })).not.toBeInTheDocument();
  });

  it('filters services by status', () => {
    render(
      <StatusPageExperience
        page={page}
        snapshot={snapshotOf([
          service(),
          service({ id: 'svc-2', name: 'Payments', status: 'DEGRADED' }),
        ])}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Degraded/ }));
    expect(screen.getByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Checkout API' })).not.toBeInTheDocument();
  });

  it('lists a multi-region service once when grouping', () => {
    // Grouping by membership renders one service several times, which during an incident reads as
    // several separate outages.
    render(
      <StatusPageExperience
        page={{ ...page, showServicesByRegion: true }}
        snapshot={snapshotOf([service({ regions: ['eu-west-1', 'us-east-1', 'ap-south-1'] })])}
      />
    );
    expect(screen.getAllByRole('heading', { name: 'Checkout API' })).toHaveLength(1);
    expect(screen.getByRole('region', { name: /Multi-region services/ })).toBeInTheDocument();
  });

  it('groups a single-region service under its own region', () => {
    render(
      <StatusPageExperience
        page={{ ...page, showServicesByRegion: true }}
        snapshot={snapshotOf([service({ regions: ['eu-west-1'] })])}
      />
    );
    expect(screen.getByRole('region', { name: /eu-west-1 services/ })).toBeInTheDocument();
  });

  it('reports a short uptime window as data rather than as unavailable', () => {
    render(
      <StatusPageExperience
        page={page}
        snapshot={snapshotOf([
          service({
            uptime: {
              days30: { percentage: 99.998, incidentCount: 1, measuredDays: 20, complete: false },
              days90: { percentage: 99.994, incidentCount: 3, measuredDays: 20, complete: false },
            },
          }),
        ])}
      />
    );
    expect(screen.getByText('99.998%')).toBeInTheDocument();
    expect(screen.getAllByText(/20 days of available data/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Unavailable \(20 days retained\)/)).not.toBeInTheDocument();
  });

  it('grades uptime against the page thresholds', () => {
    render(
      <StatusPageExperience
        page={page}
        snapshot={snapshotOf(
          [
            service({
              uptime: {
                days30: { percentage: 99.5, incidentCount: 0, measuredDays: 30, complete: true },
                days90: { percentage: 99.5, incidentCount: 0, measuredDays: 90, complete: true },
              },
            }),
          ],
          { thresholds: { uptimeExcellent: 99.99, uptimeGood: 99.9 } }
        )}
      />
    );
    // 99.5% is below a 99.9% "good" floor, so it must not read as meeting the SLA.
    expect(screen.getByText('Below SLA')).toBeInTheDocument();
  });

  it('summarises a region in words instead of six counters', () => {
    render(
      <StatusPageExperience
        page={{ ...page, showRegionHeatmap: true }}
        snapshot={snapshotOf([
          service({ regions: ['eu-west-1'] }),
          service({ id: 'svc-2', name: 'Payments', regions: ['eu-west-1'], status: 'DEGRADED' }),
        ])}
      />
    );
    expect(screen.getByRole('heading', { name: 'Region health' })).toBeInTheDocument();
    expect(screen.getByText('2 services · 1 impacted')).toBeInTheDocument();
  });

  it('says a region is healthy when it is', () => {
    render(
      <StatusPageExperience
        page={{ ...page, showRegionHeatmap: true }}
        snapshot={snapshotOf([service({ regions: ['eu-west-1'] })])}
      />
    );
    expect(screen.getByText('1 service · All systems healthy')).toBeInTheDocument();
  });

  it('explains an empty page instead of rendering nothing', () => {
    render(<StatusPageExperience page={page} snapshot={snapshotOf([])} />);
    expect(screen.getByText('No services configured for this status page')).toBeInTheDocument();
    expect(screen.getByText(/Choose which services appear here/)).toBeInTheDocument();
  });

  it('explains an empty filter result', () => {
    render(<StatusPageExperience page={page} snapshot={snapshotOf([service()])} />);
    fireEvent.change(screen.getByPlaceholderText('Search services'), {
      target: { value: 'nothing matches this' },
    });
    expect(screen.getByText('No services match your filters')).toBeInTheDocument();
  });

  it('notes when it is serving the last verified update', () => {
    render(<StatusPageExperience page={page} snapshot={snapshotOf([service()])} stale />);
    expect(screen.getByRole('note')).toHaveTextContent('Showing the last verified status update.');
  });

  it('tells the reader which clock the page uses', () => {
    render(<StatusPageExperience page={page} snapshot={snapshotOf([service()])} />);
    expect(screen.getByText(/Times shown in your local time/)).toBeInTheDocument();
  });

  it('exposes owner and tier with labels a reader can interpret', () => {
    render(
      <StatusPageExperience
        page={page}
        snapshot={snapshotOf([
          service({ slaTier: 'TIER_1', team: { id: 'team-1', name: 'Payments team' } }),
        ])}
      />
    );
    expect(screen.getByText('Owned by Payments team')).toBeInTheDocument();
    expect(screen.getByText('Service tier: TIER_1')).toBeInTheDocument();
  });
});
