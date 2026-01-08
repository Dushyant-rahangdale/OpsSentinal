import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import SidebarTrigger from '@/components/SidebarTrigger';
import { SidebarProvider } from '@/contexts/SidebarContext';

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

const renderWithProvider = (ui: ReactElement) => {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
};

describe('SidebarTrigger', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    localStorage.clear();
  });

  it('shows a label and toggles it on click', () => {
    renderWithProvider(<SidebarTrigger />);

    expect(screen.getByText('Collapse')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(button);

    expect(screen.getByText('Expand')).toBeInTheDocument();
  });
});
