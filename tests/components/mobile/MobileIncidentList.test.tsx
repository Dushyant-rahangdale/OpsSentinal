import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import MobileIncidentList from '@/components/mobile/MobileIncidentList';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe('MobileIncidentList', () => {
  it('acknowledges incident on swipe left', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MobileIncidentList
        incidents={[
          {
            id: 'inc-1',
            title: 'API Down',
            status: 'OPEN',
            urgency: 'HIGH',
            createdAt: new Date().toISOString(),
            service: { name: 'Payments' },
          },
        ]}
        filter="open"
      />
    );

    const card = screen.getByTestId('incident-card-inc-1');

    await act(async () => {
      fireEvent.touchStart(card, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(card, { touches: [{ clientX: 80 }] });
      fireEvent.touchEnd(card);
    });

    await waitFor(() => {
      const expectedUrl = new URL(
        '/api/mobile/incidents/inc-1/status',
        window.location.origin
      ).toString();
      expect(fetchMock).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });
});
