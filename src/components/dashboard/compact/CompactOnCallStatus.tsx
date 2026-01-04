'use client';

import { memo, useMemo } from 'react';

// Flexible interface to accept shifts from various sources

type OnCallShift = {
  id?: string;
  start?: Date | string;
  end?: Date | string;
  user?: { name: string | null } | { name: string };
  schedule?: { name: string };
  [key: string]: unknown;
};

interface CompactOnCallStatusProps {
  activeShifts: OnCallShift[];
}

/**
 * Safely parses a date value, returning null for invalid inputs
 */
function safeParseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;

  try {
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Compact On-Call Status Widget
 * Shows current on-call status with remaining time
 */
const CompactOnCallStatus = memo(function CompactOnCallStatus({
  activeShifts,
}: CompactOnCallStatusProps) {
  // Memoize the shifts array to prevent unnecessary recalculations
  const shifts = useMemo(() => (Array.isArray(activeShifts) ? activeShifts : []), [activeShifts]);
  const isOnCall = shifts.length > 0;

  // Memoize calculations to prevent unnecessary recalculations
  const { endDate, hoursRemaining, endTimeStr } = useMemo(() => {
    if (!isOnCall || shifts.length === 0) {
      return { endDate: null, hoursRemaining: 0, endTimeStr: '' };
    }

    const shift = shifts[0];
    const end = safeParseDate(shift?.end);
    const now = new Date();

    if (!end) {
      return { endDate: null, hoursRemaining: 0, endTimeStr: 'Unknown' };
    }

    const msRemaining = Math.max(0, end.getTime() - now.getTime());
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));

    let endStr: string;
    try {
      endStr = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      endStr = end.toISOString().slice(11, 16);
    }

    return {
      endDate: end,
      hoursRemaining: hours,
      endTimeStr: endStr,
    };
  }, [isOnCall, shifts]);

  if (!isOnCall) {
    return (
      <div
        style={{
          padding: '0.875rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-neutral-50)',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}
        role="status"
        aria-label="Not currently on-call"
      >
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          Not currently on-call
        </div>
      </div>
    );
  }

  // Handle case where end date couldn't be parsed
  if (!endDate) {
    return (
      <div
        style={{
          padding: '0.875rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-success)',
          border: '1px solid var(--color-success)',
          color: 'white',
        }}
        role="status"
        aria-label="Currently on-call"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 0 6px rgba(255,255,255,0.6)',
            }}
            aria-hidden="true"
          />
          <span
            style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            On-Call Now
          </span>
        </div>
      </div>
    );
  }

  const remainingDisplay = hoursRemaining > 0 ? `${hoursRemaining}h left` : '<1h left';

  return (
    <div
      style={{
        padding: '0.875rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-success)',
        border: '1px solid var(--color-success)',
        color: 'white',
      }}
      role="status"
      aria-label={`On-call now, ${remainingDisplay}, until ${endTimeStr}`}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.375rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 0 6px rgba(255,255,255,0.6)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
            aria-hidden="true"
          />
          <span
            style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            On-Call Now
          </span>
        </div>
        <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>{remainingDisplay}</span>
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>Until {endTimeStr}</div>
    </div>
  );
});

export default CompactOnCallStatus;
