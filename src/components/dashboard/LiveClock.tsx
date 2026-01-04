'use client';

import React, { useEffect, useState, useCallback, useRef, memo } from 'react';

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
 * Handles hydration mismatch by showing placeholder during SSR
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

  // During SSR or before hydration, show a placeholder with consistent dimensions
  if (!isMounted || time === null) {
    return (
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.6)',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          minWidth: '100px',
        }}
        aria-label="Loading clock"
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.3)',
          }}
          aria-hidden="true"
        />
        <span style={{ opacity: 0.5 }}>--:--:--</span>
      </div>
    );
  }

  const displayTimeZone = validTimeZone === 'UTC' ? 'UTC' : '';

  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.6)',
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        minWidth: '100px',
      }}
      role="timer"
      aria-label={`Current time: ${time} ${displayTimeZone}`.trim()}
      aria-live="off"
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 8px #22c55e',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span>
        {time}
        {displayTimeZone && ` ${displayTimeZone}`}
      </span>
    </div>
  );
});

export default LiveClock;
