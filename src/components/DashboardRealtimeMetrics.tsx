'use client';

import { useRealtime } from '@/hooks/useRealtime';
import { useEffect, useState } from 'react';

type DashboardRealtimeMetricsProps = {
    initialMetrics?: {
        open: number;
        acknowledged: number;
        resolved24h: number;
        highUrgency: number;
    };
    onMetricsUpdate?: (metrics: { open: number; acknowledged: number; resolved24h: number; highUrgency: number }) => void;
};

export default function DashboardRealtimeMetrics({ 
    initialMetrics, 
    onMetricsUpdate 
}: DashboardRealtimeMetricsProps) {
    const { isConnected, metrics, error } = useRealtime();
    const [displayMetrics, setDisplayMetrics] = useState(initialMetrics || {
        open: 0,
        acknowledged: 0,
        resolved24h: 0,
        highUrgency: 0
    });

    useEffect(() => {
        if (metrics) {
            setDisplayMetrics(metrics);
            if (onMetricsUpdate) {
                onMetricsUpdate(metrics);
            }
        }
    }, [metrics, onMetricsUpdate]);

    if (error) {
        return (
            <div style={{
                padding: '0.5rem',
                background: 'var(--color-warning-light)',
                color: 'var(--color-warning-dark)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                textAlign: 'center'
            }}>
                Real-time updates unavailable
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
        }}>
            {isConnected && (
                <>
                    <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--color-success)',
                        animation: 'pulse 2s ease-in-out infinite'
                    }} />
                    <span>Live</span>
                </>
            )}
        </div>
    );
}

