'use client';

import { memo } from 'react';

type StatusBadgeProps = {
  status:
    | 'OPEN'
    | 'ACKNOWLEDGED'
    | 'RESOLVED'
    | 'SNOOZED'
    | 'SUPPRESSED'
    | 'OPERATIONAL'
    | 'DEGRADED'
    | 'CRITICAL';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
};

function StatusBadge({ status, size = 'md', showDot = false }: StatusBadgeProps) {
  const sizeStyles = {
    sm: { padding: '0.22rem 0.55rem', fontSize: '0.7rem' },
    md: { padding: '0.25rem 0.75rem', fontSize: '0.8rem' },
    lg: { padding: '0.4rem 1rem', fontSize: '0.9rem' },
  };

  const statusConfig: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    OPEN: {
      bg: 'linear-gradient(180deg, #feecec 0%, #fddddd 100%)',
      color: '#dc2626',
      border: '1px solid rgba(220, 38, 38, 0.2)',
      dot: '#ef4444',
    },
    ACKNOWLEDGED: {
      bg: 'linear-gradient(180deg, #fff7e0 0%, #fff0c2 100%)',
      color: '#b45309',
      border: '1px solid rgba(180, 83, 9, 0.2)',
      dot: '#f59e0b',
    },
    RESOLVED: {
      bg: 'linear-gradient(180deg, #eaf7ef 0%, #dff3e7 100%)',
      color: '#16a34a',
      border: '1px solid rgba(22, 163, 74, 0.2)',
      dot: '#22c55e',
    },
    SNOOZED: {
      bg: 'linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%)',
      color: '#6b7280',
      border: '1px solid rgba(107, 114, 128, 0.2)',
      dot: '#9ca3af',
    },
    SUPPRESSED: {
      bg: 'linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%)',
      color: '#6b7280',
      border: '1px solid rgba(107, 114, 128, 0.2)',
      dot: '#9ca3af',
    },
    OPERATIONAL: {
      bg: 'linear-gradient(180deg, #eaf7ef 0%, #dff3e7 100%)',
      color: '#16a34a',
      border: '1px solid rgba(22, 163, 74, 0.2)',
      dot: '#22c55e',
    },
    DEGRADED: {
      bg: 'linear-gradient(180deg, #fff7e0 0%, #fff0c2 100%)',
      color: '#b45309',
      border: '1px solid rgba(180, 83, 9, 0.2)',
      dot: '#f59e0b',
    },
    CRITICAL: {
      bg: 'linear-gradient(180deg, #feecec 0%, #fddddd 100%)',
      color: '#dc2626',
      border: '1px solid rgba(220, 38, 38, 0.2)',
      dot: '#ef4444',
    },
  };

  const config = statusConfig[status] || statusConfig.OPEN;
  const style = sizeStyles[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        ...style,
        background: config.bg,
        color: config.color,
        border: config.border,
        borderRadius: '9999px',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: config.dot,
            boxShadow: `0 0 0 2px ${config.dot}33`,
          }}
        />
      )}
      {status}
    </span>
  );
}

// Memoize StatusBadge to prevent unnecessary re-renders
export default memo(StatusBadge);
