'use client';

import { CSSProperties } from 'react';

type ProgressBarVariant = 'primary' | 'success' | 'warning' | 'error' | 'info';
type ProgressBarSize = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number; // Default 100
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
  striped = false,
  className = '',
  style,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeStyles = {
    sm: { height: '4px' },
    md: { height: '8px' },
    lg: { height: '12px' },
  };

  const variantStyles = {
    primary: {
      background: 'var(--primary)',
    },
    success: {
      background: 'var(--color-success)',
    },
    warning: {
      background: 'var(--color-warning)',
    },
    error: {
      background: 'var(--color-error)',
    },
    info: {
      background: 'var(--color-info)',
    },
  };

  return (
    <div
      className={`ui-progress-bar ${className}`}
      style={{
        width: '100%',
        ...style,
      }}
    >
      {(showLabel || label) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>{label || 'Progress'}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          ...sizeStyles[size],
          background: 'var(--color-neutral-200)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          className={`ui-progress-fill ui-progress-${variant}`}
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: variantStyles[variant].background,
            borderRadius: 'var(--radius-full)',
            transition: animated ? 'width 0.3s ease' : 'none',
            backgroundImage: striped
              ? `linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)`
              : undefined,
            backgroundSize: striped ? '1rem 1rem' : undefined,
            animation: striped && animated ? 'progress-stripes 1s linear infinite' : undefined,
          }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label || 'Progress'}
        />
      </div>
    </div>
  );
}

