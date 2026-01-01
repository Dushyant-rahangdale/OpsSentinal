import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MobileIncidentActions from '@/app/(mobile)/m/incidents/[id]/actions';
import { useRouter } from 'next/navigation';
import { updateIncidentStatus, resolveIncidentWithNote } from '@/app/(app)/incidents/actions';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

vi.mock('@/app/(app)/incidents/actions', () => ({
    updateIncidentStatus: vi.fn(),
    addNote: vi.fn(),
    updateIncidentUrgency: vi.fn(),
    reassignIncident: vi.fn(),
    resolveIncidentWithNote: vi.fn(),
}));

describe('MobileIncidentActions', () => {
    const mockRouter = { refresh: vi.fn() };
    const defaultProps = {
        incidentId: 'inc-123',
        status: 'OPEN',
        urgency: 'HIGH',
        assigneeId: null,
        currentUserId: 'user-1',
        users: [{ id: 'user-1', name: 'User 1', email: 'u1@test.com' }],
        teams: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as any).mockReturnValue(mockRouter);
    });

    it('renders Acknowledge button when status is OPEN', () => {
        render(<MobileIncidentActions {...defaultProps} status="OPEN" />);
        expect(screen.getByText('Acknowledge')).toBeInTheDocument();
    });

    it('calls updateIncidentStatus on Acknowledge click', async () => {
        (updateIncidentStatus as any).mockResolvedValue({});
        render(<MobileIncidentActions {...defaultProps} status="OPEN" />);

        fireEvent.click(screen.getByText('Acknowledge'));

        await waitFor(() => {
            expect(updateIncidentStatus).toHaveBeenCalledWith('inc-123', 'ACKNOWLEDGED');
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it('shows resolution input when Resolve clicked', () => {
        render(<MobileIncidentActions {...defaultProps} status="ACKNOWLEDGED" />);

        fireEvent.click(screen.getByText('Resolve'));
        expect(screen.getByPlaceholderText(/Describe root cause/i)).toBeInTheDocument();
    });

    it('resolves incident with note', async () => {
        (resolveIncidentWithNote as any).mockResolvedValue({});
        render(<MobileIncidentActions {...defaultProps} status="ACKNOWLEDGED" />);

        // Open resolve panel
        fireEvent.click(screen.getByText('Resolve'));

        // Type note (needs > 10 chars)
        const input = screen.getByPlaceholderText(/Describe root cause/i);
        fireEvent.change(input, { target: { value: 'Fixed the issue completely.' } }); // 25 chars

        // Click Resolve with Note
        fireEvent.click(screen.getByText('Resolve with Note'));

        await waitFor(() => {
            expect(resolveIncidentWithNote).toHaveBeenCalledWith('inc-123', 'Fixed the issue completely.');
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it('shows validation error if resolution note is too short', () => {
        window.alert = vi.fn(); // Mock alert because component calls alert()
        render(<MobileIncidentActions {...defaultProps} status="ACKNOWLEDGED" />);

        fireEvent.click(screen.getByText('Resolve'));

        const input = screen.getByPlaceholderText(/Describe root cause/i);
        fireEvent.change(input, { target: { value: 'Short' } });

        // Button should be disabled or handle click with check
        // The component logic checks disabled={... || length < 10}.
        const btn = screen.getByText('Resolve with Note');
        expect(btn).toBeDisabled();
    });
});
