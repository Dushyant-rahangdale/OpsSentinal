import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardRealtimeWrapper from '@/components/DashboardRealtimeWrapper';

// Mock useRealtime hook
vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: () => ({
    isConnected: true,
    metrics: { open: 5, acknowledged: 3, resolved24h: 10, highUrgency: 2 },
    recentIncidents: [],
    error: null
  })
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn()
  })
}));

describe('DashboardRealtimeWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children', () => {
    render(
      <DashboardRealtimeWrapper>
        <div>Test Content</div>
      </DashboardRealtimeWrapper>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should call onMetricsUpdate when metrics change', () => {
    const onMetricsUpdate = vi.fn();
    
    render(
      <DashboardRealtimeWrapper onMetricsUpdate={onMetricsUpdate}>
        <div>Test</div>
      </DashboardRealtimeWrapper>
    );
    
    // Metrics should be passed to callback
    expect(onMetricsUpdate).toHaveBeenCalled();
  });

  it('should call onIncidentsUpdate when incidents change', () => {
    const onIncidentsUpdate = vi.fn();
    
    render(
      <DashboardRealtimeWrapper onIncidentsUpdate={onIncidentsUpdate}>
        <div>Test</div>
      </DashboardRealtimeWrapper>
    );
    
    // Component should handle incidents updates
    expect(onIncidentsUpdate).toHaveBeenCalled();
  });
});

