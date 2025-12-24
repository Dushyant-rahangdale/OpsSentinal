'use client';

import { useRealtime } from '@/hooks/useRealtime';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardRealtimeWrapperProps {
  children: React.ReactNode;
  onMetricsUpdate?: (metrics: { open: number; acknowledged: number; resolved24h: number; highUrgency: number }) => void;
  onIncidentsUpdate?: (incidents: any[]) => void;
}

/**
 * Wrapper component that integrates real-time updates into the dashboard
 * Automatically refreshes data when real-time events are received
 */
export default function DashboardRealtimeWrapper({
  children,
  onMetricsUpdate,
  onIncidentsUpdate
}: DashboardRealtimeWrapperProps) {
  const { isConnected, metrics, recentIncidents, error } = useRealtime();
  const router = useRouter();

  useEffect(() => {
    if (metrics && onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  useEffect(() => {
    if (recentIncidents && recentIncidents.length > 0 && onIncidentsUpdate) {
      onIncidentsUpdate(recentIncidents);
    } else if (recentIncidents && recentIncidents.length > 0) {
      // Auto-refresh if incidents updated
      router.refresh();
    }
  }, [recentIncidents, onIncidentsUpdate, router]);

  // Show connection status indicator (optional)
  if (error && process.env.NODE_ENV === 'development') {
    console.warn('Real-time connection error:', error);
  }

  return (
    <>
      {children}
      {!isConnected && (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            padding: '0.5rem 1rem',
            background: 'var(--color-warning)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            zIndex: 1000,
            display: 'none' // Hidden by default, can be enabled for debugging
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          Real-time updates disconnected
        </div>
      )}
    </>
  );
}
