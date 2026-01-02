import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import MobileIncidentList from '@/components/mobile/MobileIncidentList';
import { updateIncidentStatus } from '@/app/(app)/incidents/actions';

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: vi.fn(),
    }),
}));

vi.mock('@/app/(app)/incidents/actions', () => ({
    updateIncidentStatus: vi.fn(),
}));

describe('MobileIncidentList', () => {
    it('acknowledges incident on swipe left', async () => {
        vi.mocked(updateIncidentStatus).mockResolvedValue(undefined);

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
            />
        );

        const card = screen.getByTestId('incident-card-inc-1');

        await act(async () => {
            fireEvent.touchStart(card, { touches: [{ clientX: 200 }] });
            fireEvent.touchMove(card, { touches: [{ clientX: 80 }] });
            fireEvent.touchEnd(card);
        });

        await waitFor(() => {
            expect(updateIncidentStatus).toHaveBeenCalledWith('inc-1', 'ACKNOWLEDGED');
        });
    });
});
