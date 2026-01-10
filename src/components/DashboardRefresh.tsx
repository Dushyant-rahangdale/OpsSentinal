'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import { Button } from '@/components/ui/shadcn/button';
import { RefreshCw, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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

    const countdownInterval = setInterval(() => {
      setTimeUntilRefresh((prev) => (prev <= 1 ? autoRefreshInterval : prev - 1));
    }, 1000);

    const refreshInterval = setInterval(() => {
      handleRefresh();
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
    setTimeUntilRefresh(autoRefreshInterval);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const toggleAutoRefresh = () => {
    const newValue = !autoRefreshEnabled;
    setAutoRefreshEnabled(newValue);
    localStorage.setItem('dashboard-auto-refresh', String(newValue));
    if (newValue) setTimeUntilRefresh(autoRefreshInterval);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="text-sm font-medium text-white/90">
        {mounted && lastUpdated ? (
          <>
            Updated: {formatDateTime(lastUpdated, userTimeZone, { format: 'time' })}
            {autoRefreshEnabled && (
              <span className="ml-2 text-xs opacity-80 font-mono">
                (Auto: {timeUntilRefresh}s)
              </span>
            )}
          </>
        ) : (
          <span>Updated: --:--</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="secondary"
          size="sm"
          className="h-8 gap-2 bg-white text-slate-800 hover:bg-white/90 font-semibold shadow-sm"
          title="Refresh dashboard data"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>

        <Button
          onClick={toggleAutoRefresh}
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all",
            autoRefreshEnabled ? "bg-white/20" : "bg-transparent"
          )}
          title={autoRefreshEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh'}
        >
          <RotateCw className="h-3.5 w-3.5" />
          {autoRefreshEnabled ? 'Auto ON' : 'Auto OFF'}
        </Button>
      </div>
    </div>
  );
}
