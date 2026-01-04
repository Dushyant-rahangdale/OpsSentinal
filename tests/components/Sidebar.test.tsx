import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '@/components/Sidebar';

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const mockFetch = () => {
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ activeIncidentsCount: 0 }),
  } as unknown as Response);
};

describe('Sidebar', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mockFetch();
    localStorage.clear();
  });

  it('renders expanded by default', () => {
    render(<Sidebar userName="Alex Doe" userEmail="alex@example.com" userRole="ADMIN" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('honors collapsed state from localStorage', () => {
    localStorage.setItem('sidebarCollapsed', '1');

    render(<Sidebar userName="Alex Doe" userEmail="alex@example.com" userRole="ADMIN" />);

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('toggles collapse state and persists it', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<Sidebar userName="Alex Doe" userEmail="alex@example.com" userRole="ADMIN" />);
    setItemSpy.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    await waitFor(() => {
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(setItemSpy).toHaveBeenCalledWith('sidebarCollapsed', '1');
    });

    fireEvent.click(screen.getByRole('button', { name: /expand sidebar/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(setItemSpy).toHaveBeenCalledWith('sidebarCollapsed', '0');
    });
  });
});
