import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StatusPageConfig from './StatusPageConfig';
import { TimezoneProvider } from '@/contexts/TimezoneContext';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock('@/components/status-page/StatusPageLivePreview', () => ({
  default: () => <div>Live Preview Mock</div>,
}));

// Mock TimezoneContext if needed, or use the real provider if it has no complex dependencies
// But we can just mock the hook
vi.mock('@/contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    browserTimeZone: 'UTC',
  }),
  TimezoneProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('StatusPageConfig', () => {
  const mockStatusPage = {
    id: 'sp-123',
    name: 'My Status Page',
    enabled: true,
    showServices: true,
    showIncidents: true,
    showMetrics: true,
    services: [],
    announcements: [],
    apiTokens: [],
    // Privacy settings default
    privacyMode: 'PUBLIC',
    showIncidentDetails: true,
  };

  const mockAllServices: any[] = [];

  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as any;
  });

  it('updates privacy settings when changed and saved', async () => {
    render(<StatusPageConfig statusPage={mockStatusPage as any} allServices={mockAllServices} />);

    // Click on Privacy & Data tab
    const privacyTab = screen.getByText('Privacy & Data');
    fireEvent.click(privacyTab);

    // Find "Show Incident Details" switch
    // Navigate from label text to the switch control (sibling)
    const labelText = screen.getByText('Show Incident Details');
    // labelText is the span, parent is the label element, which contains the switch div
    const switchControl = labelText.closest('label')?.querySelector('[role="switch"]');
    if (!switchControl) throw new Error('Switch control not found');

    console.log('Found switch control', switchControl.getAttribute('aria-checked'));
    fireEvent.click(switchControl);
    console.log('Clicked switch control');

    // Wait for the state update to reflect in the UI
    await waitFor(() => {
      expect(switchControl).toHaveAttribute('aria-checked', 'false');
    });

    // Click Save Settings
    const saveButton = screen.getByText(/Save Settings/i);
    fireEvent.click(saveButton);

    // Verify API was called with updated settings
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings/status-page',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"showIncidentDetails":false'),
        })
      );
    });
  });
});
