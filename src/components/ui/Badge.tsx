'use client';

import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Badge component for labels and status indicators
 * 
 * @example
 * <Badge variant="success" size="md" dot>Active</Badge>
 */
export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-1)',
    borderRadius: 'var(--radius-full)',
    fontWeight: 'var(--font-weight-medium)',
    whiteSpace: 'nowrap',
  };

  const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
    sm: {
      padding: 'var(--spacing-1) var(--spacing-2)',
      fontSize: 'var(--font-size-xs)',
      height: '18px',
    },
    md: {
      padding: 'var(--spacing-1) var(--spacing-3)',
      fontSize: 'var(--font-size-sm)',
      height: '22px',
    },
    lg: {
      padding: 'var(--spacing-2) var(--spacing-4)',
      fontSize: 'var(--font-size-base)',
      height: '26px',
    },
  };

  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    default: {
      background: 'var(--color-neutral-100)',
      color: 'var(--text-primary)',
    },
    primary: {
      background: 'var(--primary)',
      color: 'var(--text-inverse)',
    },
    success: {
      background: 'var(--color-success-light)',
      color: 'var(--color-success-dark)',
    },
    warning: {
      background: 'var(--color-warning-light)',
      color: 'var(--color-warning-dark)',
    },
    error: {
      background: 'var(--color-error-light)',
      color: 'var(--color-error-dark)',
    },
    info: {
      background: 'var(--color-info-light)',
      color: 'var(--color-info-dark)',
    },
  };

  const dotStyles: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: 'var(--radius-full)',
    background: 'currentColor',
  };

  return (
    <span
      className={`ui-badge ui-badge-${variant} ui-badge-${size} ${className}`}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
    >
      {dot && <span style={dotStyles} />}
      {children}
    </span>
  );
}

