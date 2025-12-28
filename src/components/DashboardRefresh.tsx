'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

type DashboardRefreshProps = {
  autoRefreshInterval?: number; // in seconds, default 60
};

export default function DashboardRefresh({ autoRefreshInterval = 60 }: DashboardRefreshProps) {
  const router = useRouter();
  const { userTimeZone } = useTimezone();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(autoRefreshInterval);
  const [mounted, setMounted] = useState(false);

  // Only set time after component mounts on client
  useEffect(() => {
    setMounted(true);
    setLastUpdated(new Date());
  }, []);

  // Load auto-refresh preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-auto-refresh');
    if (saved !== null) {
      setAutoRefreshEnabled(saved === 'true');
    }
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefreshEnabled) {
      setTimeUntilRefresh(autoRefreshInterval);
      return;
    }

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1) {
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-refresh interval
    const refreshInterval = setInterval(() => {
      setIsRefreshing(true);
      router.refresh();
      setLastUpdated(new Date());
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }, autoRefreshInterval * 1000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [router, autoRefreshInterval, autoRefreshEnabled]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setLastUpdated(new Date());
    setTimeUntilRefresh(autoRefreshInterval); // Reset countdown
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const toggleAutoRefresh = () => {
    const newValue = !autoRefreshEnabled;
    setAutoRefreshEnabled(newValue);
    localStorage.setItem('dashboard-auto-refresh', String(newValue));
    if (newValue) {
      setTimeUntilRefresh(autoRefreshInterval);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' }}>
        {mounted && lastUpdated ? (
          <>
            Updated: {formatDateTime(lastUpdated, userTimeZone, { format: 'time' })}
            {autoRefreshEnabled && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                (Auto: {timeUntilRefresh}s)
              </span>
            )}
          </>
        ) : (
          <span>Updated: --:--</span>
        )}
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="command-button"
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.85rem',
          border: 'none',
          background: 'white',
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          color: '#1f2937',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          opacity: isRefreshing ? 0.6 : 1,
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
        title="Refresh dashboard data"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ 
          animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
          transformOrigin: 'center'
        }}>
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </button>
      <button
        onClick={toggleAutoRefresh}
        style={{
          padding: '0.4rem 0.75rem',
          borderRadius: '8px',
          fontSize: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          background: autoRefreshEnabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          cursor: 'pointer',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}
        title={autoRefreshEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh'}
      >
        <span style={{ fontSize: '0.7rem' }}>🔄</span>
        {autoRefreshEnabled ? 'Auto ON' : 'Auto OFF'}
      </button>
    </div>
  );
}

