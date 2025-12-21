'use client';

import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

export default function Badge({
  variant = 'default',
  size = 'md',
  children,
  dot = false,
  icon,
  className = '',
}: BadgeProps) {
  const sizeStyles = {
    sm: {
      padding: '0.25rem 0.5rem',
      fontSize: 'var(--font-size-xs)',
      height: '20px',
    },
    md: {
      padding: '0.375rem 0.75rem',
      fontSize: 'var(--font-size-sm)',
      height: '24px',
    },
    lg: {
      padding: '0.5rem 1rem',
      fontSize: 'var(--font-size-base)',
      height: '28px',
    },
  };

  const variantStyles = {
    default: {
      background: 'var(--color-neutral-100)',
      color: 'var(--text-primary)',
    },
    primary: {
      background: 'var(--primary)',
      color: 'white',
    },
    success: {
      background: 'var(--color-success)',
      color: 'white',
    },
    warning: {
      background: 'var(--color-warning)',
      color: 'white',
    },
    error: {
      background: 'var(--color-error)',
      color: 'white',
    },
    info: {
      background: 'var(--color-info)',
      color: 'white',
    },
  };

  return (
    <span
      className={`ui-badge ui-badge-${variant} ui-badge-${size} ${className}`}
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        borderRadius: 'var(--radius-full)',
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
          }}
        />
      )}
      {icon && <span className="ui-badge-icon">{icon}</span>}
      {children}
    </span>
  );
}


