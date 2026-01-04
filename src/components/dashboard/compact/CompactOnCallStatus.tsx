'use client';

/**
 * Compact On-Call Status - Subtle Design
 */
export default function CompactOnCallStatus({ activeShifts }: { activeShifts: any[] }) {
  const isOnCall = activeShifts && activeShifts.length > 0;

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

  const currentShift = activeShifts[0];
  const now = new Date();
  const end = new Date(currentShift.end);
  const hoursRemaining = Math.max(
    0,
    Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60))
  );

  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      style={{
        padding: '0.875rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-success)',
        border: '1px solid var(--color-success-dark)',
        color: 'white',
      }}
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
            }}
          />
          <span
            style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            On-Call Now
          </span>
        </div>
        <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>
          {hoursRemaining}h left
        </span>
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>Until {endTime}</div>
    </div>
  );
}
