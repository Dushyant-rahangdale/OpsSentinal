'use client';

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

type EventStreamOptions = {
  incidentId?: string;
  serviceId?: string;
  enabled?: boolean;
  onMessage?: (data: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  onError?: (error: Error) => void;
};

/**
 * React hook for subscribing to Server-Sent Events (SSE) stream
 *
 * @example
 * const { data, isConnected } = useEventStream({
 *   incidentId: 'inc_123',
 *   onMessage: (data) => logger.info('Update', { data }),
 * });
 */
export function useEventStream(options: EventStreamOptions = {}) {
  const { incidentId, serviceId, enabled = true, onMessage, onError } = options;
  const [data, setData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Use refs for callbacks to avoid re-creating EventSource on callback changes
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Keep refs in sync with latest callbacks
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Build query string
    const params = new URLSearchParams();
    if (incidentId) params.set('incidentId', incidentId);
    if (serviceId) params.set('serviceId', serviceId);

    const url = `/api/events/stream?${params.toString()}`;

    // Create EventSource connection
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = event => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
        onMessageRef.current?.(parsed);
      } catch (err) {
        logger.error('Failed to parse SSE message', { component: 'useEventStream', error: err });
      }
    };

    eventSource.onerror = _err => {
      setIsConnected(false);
      const connectionError = new Error('Event stream connection error');
      setError(connectionError);
      onErrorRef.current?.(connectionError);

      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          eventSourceRef.current = new EventSource(url);
        }
      }, 3000);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [incidentId, serviceId, enabled]); // Removed onMessage, onError from deps

  return { data, isConnected, error };
}
