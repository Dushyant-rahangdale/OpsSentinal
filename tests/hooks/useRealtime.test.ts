import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRealtime } from '@/hooks/useRealtime';

// Mock EventSource
global.EventSource = vi.fn().mockImplementation(() => {
  const mockEventSource = {
    onopen: null as ((event: Event) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    close: vi.fn(),
  };

  // Simulate connection after a short delay
  setTimeout(() => {
    if (mockEventSource.onopen) {
      mockEventSource.onopen(new Event('open'));
    }
  }, 0);

  return mockEventSource;
});

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useRealtime());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.metrics).toBeNull();
    expect(result.current.recentIncidents).toEqual([]);
  });

  it('should create EventSource connection', () => {
    renderHook(() => useRealtime());
    expect(global.EventSource).toHaveBeenCalledWith('/api/realtime/stream');
  });

  it('should handle connection open', async () => {
    const { result } = renderHook(() => useRealtime());
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should handle metrics update', async () => {
    const { result } = renderHook(() => useRealtime());
    
    // Get the EventSource instance
    const eventSourceInstance = (global.EventSource as any).mock.results[0].value;
    
    // Simulate metrics update
    const metricsEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'metrics_updated',
        metrics: {
          open: 5,
          acknowledged: 3,
          resolved24h: 10,
          highUrgency: 2
        },
        timestamp: new Date().toISOString()
      })
    });

    await waitFor(() => {
      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage(metricsEvent);
      }
    });

    await waitFor(() => {
      expect(result.current.metrics).toEqual({
        open: 5,
        acknowledged: 3,
        resolved24h: 10,
        highUrgency: 2
      });
    });
  });

  it('should handle incidents update', async () => {
    const { result } = renderHook(() => useRealtime());
    
    const eventSourceInstance = (global.EventSource as any).mock.results[0].value;
    
    const incidentsEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'incidents_updated',
        incidents: [{ id: '1', title: 'Test Incident' }],
        timestamp: new Date().toISOString()
      })
    });

    await waitFor(() => {
      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage(incidentsEvent);
      }
    });

    await waitFor(() => {
      expect(result.current.recentIncidents).toEqual([{ id: '1', title: 'Test Incident' }]);
    });
  });

  it('should handle connection errors', async () => {
    const { result } = renderHook(() => useRealtime());
    
    const eventSourceInstance = (global.EventSource as any).mock.results[0].value;
    
    // Simulate error
    await waitFor(() => {
      if (eventSourceInstance.onerror) {
        eventSourceInstance.onerror(new Event('error'));
      }
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useRealtime());
    const eventSourceInstance = (global.EventSource as any).mock.results[0].value;
    
    unmount();
    
    expect(eventSourceInstance.close).toHaveBeenCalled();
  });
});
