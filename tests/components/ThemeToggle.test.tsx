import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '@/components/ThemeToggle';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('ThemeToggle', () => {
    beforeEach(() => {
        localStorageMock.clear();
        document.documentElement.classList.remove('dark');
    });

    it('should render theme toggle buttons', () => {
        render(<ThemeToggle />);

        expect(screen.getByLabelText('Switch to light theme')).toBeInTheDocument();
        expect(screen.getByLabelText('Use system theme')).toBeInTheDocument();
        expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
    });

    it('should default to system theme', () => {
        render(<ThemeToggle />);

        const systemButton = screen.getByLabelText('Use system theme');
        expect(systemButton).toBeInTheDocument();
    });

    it('should switch to light theme when clicked', () => {
        render(<ThemeToggle />);

        const lightButton = screen.getByLabelText('Switch to light theme');
        fireEvent.click(lightButton);

        expect(localStorageMock.getItem('theme')).toBe('light');
    });

    it('should switch to dark theme when clicked', () => {
        render(<ThemeToggle />);

        const darkButton = screen.getByLabelText('Switch to dark theme');
        fireEvent.click(darkButton);

        expect(localStorageMock.getItem('theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should persist theme preference in localStorage', () => {
        localStorageMock.setItem('theme', 'dark');
        render(<ThemeToggle />);

        const darkButton = screen.getByLabelText('Switch to dark theme');
        expect(darkButton).toBeInTheDocument();
    });
});

