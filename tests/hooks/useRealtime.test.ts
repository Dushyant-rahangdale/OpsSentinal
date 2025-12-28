import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRealtime } from '@/hooks/useRealtime';

type MockEventSource = {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
};

function getMockEventSourceInstance(index = 0): MockEventSource {
  const eventSourceMock = global.EventSource as unknown as {
    mock: { results: Array<{ value: MockEventSource }> };
  };
  return eventSourceMock.mock.results[index].value;
}

// Mock EventSource
global.EventSource = vi.fn().mockImplementation(() => {
  const mockEventSource: MockEventSource = {
    onopen: null as ((event: Event) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    close: vi.fn(),
  };

  return mockEventSource;
});

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const eventSourceInstance = getMockEventSourceInstance();
    act(() => {
      eventSourceInstance.onopen?.(new Event('open'));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should handle metrics update', async () => {
    const { result } = renderHook(() => useRealtime());

    // Get the EventSource instance
    const eventSourceInstance = getMockEventSourceInstance();

    // Simulate metrics update
    const metricsEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'metrics_updated',
        metrics: {
          open: 5,
          acknowledged: 3,
          resolved24h: 10,
          highUrgency: 2,
        },
        timestamp: new Date().toISOString(),
      }),
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
        highUrgency: 2,
      });
    });
  });

  it('should handle incidents update', async () => {
    const { result } = renderHook(() => useRealtime());

    const eventSourceInstance = getMockEventSourceInstance();

    const incidentsEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'incidents_updated',
        incidents: [{ id: '1', title: 'Test Incident' }],
        timestamp: new Date().toISOString(),
      }),
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

    const eventSourceInstance = getMockEventSourceInstance();

    // Simulate error
    act(() => {
      eventSourceInstance.onerror?.(new Event('error'));
    });

    // After an error, hook marks disconnected and schedules a reconnect.
    await waitFor(() => expect(result.current.isConnected).toBe(false));
    expect(eventSourceInstance.close).toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useRealtime());
    const eventSourceInstance = getMockEventSourceInstance();

    unmount();

    expect(eventSourceInstance.close).toHaveBeenCalled();
  });
});
