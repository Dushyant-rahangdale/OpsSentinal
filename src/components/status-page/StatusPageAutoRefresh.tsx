'use client';

import { useEffect } from 'react';

type StatusPageAutoRefreshProps = {
  enabled: boolean;
  intervalSeconds: number;
};

export default function StatusPageAutoRefresh({
  enabled,
  intervalSeconds,
}: StatusPageAutoRefreshProps) {
  useEffect(() => {
    if (!enabled) return;

    const parsedInterval = Number.isFinite(intervalSeconds) ? intervalSeconds : 60;
    const clampedSeconds = Math.max(30, parsedInterval);
    const refreshMs = clampedSeconds * 1000;

    const timeout = window.setTimeout(() => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_t', Date.now().toString());
        window.location.replace(url.toString());
      } catch (error) {
        console.error('[Status Page] Auto-refresh error:', error);
      }
    }, refreshMs);

    return () => window.clearTimeout(timeout);
  }, [enabled, intervalSeconds]);

  return null;
}
