'use client';

import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { cn } from '@/lib/utils';

type LiveClockProps = {
  timeZone?: string;
};

/**
 * Validates if a timezone string is valid
 */
function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * LiveClock Component
 * Displays a live-updating clock with timezone support
 * Redesigned to match dark-themed "hacker" aesthetic
 */
const LiveClock = memo(function LiveClock({ timeZone = 'UTC' }: LiveClockProps) {
  const [time, setTime] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Validate and normalize timezone
  const validTimeZone = isValidTimeZone(timeZone) ? timeZone : 'UTC';

  const formatTime = useCallback(() => {
    try {
      return new Date().toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: validTimeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      // Ultimate fallback
      return new Date().toISOString().slice(11, 19);
    }
  }, [validTimeZone]);

  useEffect(() => {
    // Mark as mounted to enable client-side rendering
    setIsMounted(true);

    // Set initial time after mount to avoid hydration mismatch
    setTime(formatTime());

    // Update every second
    timerRef.current = setInterval(() => {
      setTime(formatTime());
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [formatTime]);

  // Loading state
  if (!isMounted || time === null) {
    return (
      <div
        className="font-mono text-sm bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-md flex items-center gap-3 shadow-inner shadow-black/20"
        aria-label="Loading clock"
      >
        <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" aria-hidden="true" />
        <span className="opacity-50 tracking-widest">--:--:--</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "font-mono text-base bg-[#1a1f2e] border border-slate-800/60 text-slate-200 px-4 py-2 rounded-lg flex items-center gap-3 shadow-lg shadow-black/10 select-none",
        "bg-gradient-to-b from-[#1e2336] to-[#151926]"
      )}
      role="timer"
      aria-label={`Current time: ${time}`}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
          aria-hidden="true"
        />
      </div>
      <span className="tracking-[0.1em] font-medium opacity-90 text-lg">
        {time}
      </span>
    </div>
  );
});

export default LiveClock;
