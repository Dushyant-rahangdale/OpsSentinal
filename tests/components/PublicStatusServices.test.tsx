import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicStatusServices from '@/components/status-page/PublicStatusServices';
import type { PublicStatusService } from '@/lib/status-pages/public-contract';

const services: PublicStatusService[] = [{
  id: 'service-1',
  name: 'API',
  status: 'OPERATIONAL',
  activeIncidentCount: 0,
  history: [{
    date: '2026-09-09',
    status: 'DEGRADED',
    availabilityPercent: 99.5,
    incidentCount: 1,
  }],
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
