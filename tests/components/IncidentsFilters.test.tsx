import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import IncidentsFilters from '@/components/incident/IncidentsFilters';

const push = vi.fn();
const searchParams = new URLSearchParams('priority=P1');

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push,
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useSearchParams: () => searchParams,
}));

describe('IncidentsFilters', () => {
    beforeEach(() => {
        push.mockClear();
    });

    it('skips navigation when params are unchanged', () => {
        render(
            <IncidentsFilters
                currentFilter="all_open"
                currentPriority="P1"
                currentUrgency="all"
                currentSort="newest"
                currentSearch=""
            />
        );

        const prioritySelect = screen.getByDisplayValue('P1 - Critical');
        fireEvent.change(prioritySelect, { target: { value: 'P1' } });

        expect(push).not.toHaveBeenCalled();
    });

    it('removes query string when all filters are reset', () => {
        render(
            <IncidentsFilters
                currentFilter="all_open"
                currentPriority="P1"
                currentUrgency="all"
                currentSort="newest"
                currentSearch=""
            />
        );

        const prioritySelect = screen.getByDisplayValue('P1 - Critical');
        fireEvent.change(prioritySelect, { target: { value: 'all' } });

        expect(push).toHaveBeenCalledWith('/incidents');
    });
});
