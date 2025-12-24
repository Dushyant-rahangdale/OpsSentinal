'use client';

import { useEffect, useRef, useState } from 'react';

type EventStreamOptions = {
    incidentId?: string;
    serviceId?: string;
    enabled?: boolean;
    onMessage?: (data: any) => void;
    onError?: (error: Error) => void;
};

/**
 * React hook for subscribing to Server-Sent Events (SSE) stream
 * 
 * @example
 * const { data, isConnected } = useEventStream({
 *   incidentId: 'inc_123',
 *   onMessage: (data) => console.log('Update:', data),
 * });
 */
export function useEventStream(options: EventStreamOptions = {}) {
    const { incidentId, serviceId, enabled = true, onMessage, onError } = options;
    const [data, setData] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

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

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                setData(parsed);
                onMessage?.(parsed);
            } catch (err) {
                console.error('Failed to parse SSE message:', err);
            }
        };

        eventSource.onerror = (err) => {
            setIsConnected(false);
            const error = new Error('Event stream connection error');
            setError(error);
            onError?.(error);
            
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
    }, [incidentId, serviceId, enabled, onMessage, onError]);

    return { data, isConnected, error };
}







