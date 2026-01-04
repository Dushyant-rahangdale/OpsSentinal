'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { WidgetDataContext } from '@/lib/widget-data-provider';

const WidgetContext = createContext<WidgetDataContext | null>(null);

interface WidgetProviderProps {
  children: ReactNode;
  initialData: WidgetDataContext;
}

/**
 * Widget Data Provider with SSE for Real-time Updates
 * Provides widget data to all child components via React Context
 */
export function WidgetProvider({ children, initialData }: WidgetProviderProps) {
  const [data, setData] = useState<WidgetDataContext>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/widgets/stream');

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
          console.log('[WidgetProvider] SSE connection established');
        };

        eventSource.onmessage = event => {
          try {
            const newData = JSON.parse(event.data);
            setData({
              ...newData,
              lastUpdated: new Date(newData.lastUpdated),
            });
          } catch (err) {
            console.error('[WidgetProvider] Failed to parse SSE data:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          setError('Connection lost, reconnecting...');
          eventSource?.close();

          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('[WidgetProvider] Reconnecting...');
            connect();
          }, 5000);
        };
      } catch (err) {
        console.error('[WidgetProvider] Failed to establish SSE connection:', err);
        setError('Failed to connect');
      }
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        console.log('[WidgetProvider] SSE connection closed');
      }
    };
  }, []);

  return (
    <WidgetContext.Provider value={data}>
      {error && (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '500',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {error}
        </div>
      )}
      {children}
    </WidgetContext.Provider>
  );
}

/**
 * Hook to access widget data in child components
 */
export function useWidgetData() {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error('useWidgetData must be used within WidgetProvider');
  }
  return context;
}
