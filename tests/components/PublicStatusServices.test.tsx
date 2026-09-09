import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicStatusServices from '@/components/status-page/PublicStatusServices';
import { buildPublicHistoryDays } from '@/lib/status-pages/history-presentation';
import type { PublicStatusService } from '@/lib/status-pages/public-contract';

const services: PublicStatusService[] = [{
  id: 'service-1',
  name: 'API',
  status: 'OPERATIONAL',
  activeIncidentCount: 0,
  history: {
    rangeStart: '2026-09-09T00:00:00.000Z',
    rangeEnd: '2026-09-10T00:00:00.000Z',
    coverage: 'COMPLETE',
    segments: [{
      startAt: '2026-09-09T10:00:00.000Z',
      endAt: '2026-09-09T10:30:00.000Z',
      status: 'DEGRADED',
    }],
  },
}];

describe('PublicStatusServices history interaction', () => {
  it('opens once for a pointer click and exposes a stable tooltip relationship', () => {
    render(<PublicStatusServices services={services} />);
    const cell = screen.getByRole('button', { name: /2026-09-09, API/i });

    fireEvent.pointerDown(cell);
    fireEvent.focus(cell);
    fireEvent.click(cell);

    const tooltip = screen.getByRole('tooltip');
    expect(cell).toHaveAttribute('aria-expanded', 'true');
    expect(cell).toHaveAttribute('aria-describedby', tooltip.id);
    expect(tooltip.id).toBe('status-history-service-1-2026-09-09');

    fireEvent.pointerDown(cell);
    fireEvent.click(cell);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(cell).not.toHaveAttribute('aria-describedby');
  });

  it('opens history details when reached by keyboard focus', () => {
    render(<PublicStatusServices services={services} />);
    const cell = screen.getByRole('button', { name: /2026-09-09, API/i });

    fireEvent.focus(cell);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(cell).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('browser-local status history', () => {
  const history = {
    rangeStart: '2026-09-08T00:00:00.000Z',
    rangeEnd: '2026-09-10T00:00:00.000Z',
    coverage: 'COMPLETE' as const,
    segments: [{
      startAt: '2026-09-08T20:00:00.000Z',
      endAt: '2026-09-08T21:00:00.000Z',
      status: 'DEGRADED' as const,
    }],
  };

  it('assigns UTC segments to Kolkata calendar days', () => {
    const days = buildPublicHistoryDays(history, 'Asia/Kolkata');

    expect(days.find(day => day.status === 'DEGRADED')).toMatchObject({
      date: '2026-09-09',
      incidentCount: 1,
    });
  });

  it('assigns the same UTC segments to New York calendar days', () => {
    const days = buildPublicHistoryDays(history, 'America/New_York');

    expect(days.find(day => day.status === 'DEGRADED')).toMatchObject({
      date: '2026-09-08',
      incidentCount: 1,
    });
  });

  it('uses the real 25-hour New York day across the DST fallback', () => {
    const days = buildPublicHistoryDays({
      rangeStart: '2026-11-01T04:00:00.000Z',
      rangeEnd: '2026-11-02T05:00:00.000Z',
      coverage: 'COMPLETE',
      segments: [{
        startAt: '2026-11-01T05:30:00.000Z',
        endAt: '2026-11-01T06:30:00.000Z',
        status: 'DEGRADED',
      }],
    }, 'America/New_York');

    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ date: '2026-11-01', availabilityPercent: 96 });
    expect(days[0]?.timeline?.at(-1)?.endMinute).toBe(1500);
  });

  it('renders unknown gaps when source history coverage is partial', () => {
    const days = buildPublicHistoryDays({
      rangeStart: '2026-09-09T00:00:00.000Z',
      rangeEnd: '2026-09-10T00:00:00.000Z',
      coverage: 'PARTIAL',
      segments: [],
    }, 'Asia/Kolkata');

    expect(days.every(day => day.status === 'UNKNOWN')).toBe(true);
    expect(days.every(day => day.availabilityPercent === null)).toBe(true);
  });
});
