import { render, screen, fireEvent } from '@testing-library/react';
import MobileThemeToggle from '@/components/mobile/MobileThemeToggle';
import { useTheme } from 'next-themes';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock next-themes
vi.mock('next-themes', () => ({
    useTheme: vi.fn(),
}));

describe('MobileThemeToggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        (useTheme as any).mockReturnValue({ theme: 'light', setTheme: vi.fn() });
        render(<MobileThemeToggle />);
        expect(screen.getAllByText('Dark Mode').length).toBeGreaterThan(0);
    });

    it('toggles from light to dark', () => {
        const setTheme = vi.fn();
        (useTheme as any).mockReturnValue({ theme: 'light', setTheme });

        render(<MobileThemeToggle />);

        const label = screen.getByText('Dark Mode');
        fireEvent.click(label);

        expect(setTheme).toHaveBeenCalledWith('dark');
    });

    it('toggles from dark to light', () => {
        const setTheme = vi.fn();
        (useTheme as any).mockReturnValue({ theme: 'dark', setTheme });

        render(<MobileThemeToggle />);

        const label = screen.getByText('Dark Mode');
        fireEvent.click(label);

        expect(setTheme).toHaveBeenCalledWith('light');
    });
});
