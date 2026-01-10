'use client';

import { useRealtime } from '@/hooks/useRealtime';
import { useEffect, useState } from 'react';
import { AlertCircle, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';

type DashboardRealtimeMetricsProps = {
  initialMetrics?: {
    open: number;
    acknowledged: number;
    resolved24h: number;
    highUrgency: number;
  };
  onMetricsUpdate?: (metrics: {
    open: number;
    acknowledged: number;
    resolved24h: number;
    highUrgency: number;
  }) => void;
};

export default function DashboardRealtimeMetrics({
  initialMetrics,
  onMetricsUpdate,
}: DashboardRealtimeMetricsProps) {
  const { isConnected, metrics, error } = useRealtime();
  const [_displayMetrics, setDisplayMetrics] = useState(
    initialMetrics || {
      open: 0,
      acknowledged: 0,
      resolved24h: 0,
      highUrgency: 0,
    }
  );

  useEffect(() => {
    if (metrics) {
      setDisplayMetrics(metrics); // eslint-disable-line react-hooks/set-state-in-effect
      if (onMetricsUpdate) {
        onMetricsUpdate(metrics);
      }
    }
  }, [metrics, onMetricsUpdate]);

  if (error) {
    return (
      <Badge variant="warning" size="xs">
        <AlertCircle className="h-3 w-3 mr-1.5" />
        Real-time updates unavailable
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isConnected && (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <Wifi className="h-3 w-3" />
          <span className="font-medium">Live</span>
        </>
      )}
    </div>
  );
}
