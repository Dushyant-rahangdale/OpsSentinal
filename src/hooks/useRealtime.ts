'use client';

import { useEffect, useState, useRef } from 'react';

export type RealtimeEvent = 
    | { type: 'connected'; timestamp: string }
    | { type: 'incidents_updated'; incidents: any[]; timestamp: string }
    | { type: 'metrics_updated'; metrics: { open: number; acknowledged: number; resolved24h: number; highUrgency: number }; timestamp: string }
    | { type: 'heartbeat'; timestamp: string }
    | { type: 'error'; message: string; timestamp: string };

export type RealtimeMetrics = {
    open: number;
    acknowledged: number;
    resolved24h: number;
    highUrgency: number;
};

export function useRealtime() {
    const [isConnected, setIsConnected] = useState(false);
    const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
    const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    useEffect(() => {
        let mounted = true;

        const connect = () => {
            if (!mounted) return;

            try {
                const eventSource = new EventSource('/api/realtime/stream');
                eventSourceRef.current = eventSource;

                eventSource.onopen = () => {
                    if (!mounted) return;
                    setIsConnected(true);
                    setError(null);
                    reconnectAttempts.current = 0;
                };

                eventSource.onmessage = (event) => {
                    if (!mounted) return;
                    
                    try {
                        const data: RealtimeEvent = JSON.parse(event.data);
                        
                        switch (data.type) {
                            case 'connected':
                                setIsConnected(true);
                                break;
                            case 'incidents_updated':
                                setRecentIncidents(data.incidents);
                                break;
                            case 'metrics_updated':
                                setMetrics(data.metrics);
                                break;
                            case 'heartbeat':
                                // Keep connection alive
                                break;
                            case 'error':
                                setError(data.message);
                                break;
                        }
                    } catch (err) {
                        console.error('Failed to parse SSE event:', err);
                    }
                };

                eventSource.onerror = () => {
                    if (!mounted) return;
                    setIsConnected(false);
                    eventSource.close();

                    // Attempt to reconnect with exponential backoff
                    if (reconnectAttempts.current < maxReconnectAttempts) {
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                        reconnectAttempts.current++;
                        
                        reconnectTimeoutRef.current = setTimeout(() => {
                            if (mounted) {
                                connect();
                            }
                        }, delay);
                    } else {
                        setError('Failed to connect to real-time updates. Please refresh the page.');
                    }
                };
            } catch (err) {
                console.error('Failed to create EventSource:', err);
                setError('Real-time updates not available');
            }
        };

        connect();

        return () => {
            mounted = false;
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    return {
        isConnected,
        metrics,
        recentIncidents,
        error
    };
}

