'use client';

import { ReactNode } from 'react';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';
type AlertSize = 'sm' | 'md' | 'lg';

interface AlertProps {
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export default function Alert({
  variant = 'info',
  size = 'md',
  title,
  children,
  icon,
  onClose,
  className = '',
}: AlertProps) {
  const variantStyles = {
    success: {
      background: 'var(--color-success-light)',
      borderColor: 'var(--color-success)',
      color: 'var(--color-success-dark)',
      icon: '✓',
    },
    warning: {
      background: '#fef3c7',
      borderColor: 'var(--color-warning)',
      color: '#92400e',
      icon: '⚠️',
    },
    error: {
      background: 'var(--color-error-light)',
      borderColor: 'var(--color-error)',
      color: 'var(--color-error-dark)',
      icon: '⚠️',
    },
    info: {
      background: 'var(--color-info-light)',
      borderColor: 'var(--color-info)',
      color: 'var(--color-info-dark)',
      icon: 'ℹ️',
    },
  };

  const sizeStyles = {
    sm: {
      padding: 'var(--spacing-3)',
      fontSize: 'var(--font-size-sm)',
    },
    md: {
      padding: 'var(--spacing-4)',
      fontSize: 'var(--font-size-base)',
    },
    lg: {
      padding: 'var(--spacing-6)',
      fontSize: 'var(--font-size-lg)',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`ui-alert ui-alert-${variant} ui-alert-${size} ${className}`}
      style={{
        ...sizeStyles[size],
        background: styles.background,
        border: `1px solid ${styles.borderColor}`,
        borderRadius: 'var(--radius-md)',
        color: styles.color,
        display: 'flex',
        gap: 'var(--spacing-3)',
        alignItems: title ? 'flex-start' : 'center',
      }}
      role="alert"
    >
      {(icon || styles.icon) && (
        <span
          style={{
            fontSize: size === 'sm' ? '1rem' : size === 'md' ? '1.25rem' : '1.5rem',
            flexShrink: 0,
          }}
        >
          {icon || styles.icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              marginBottom: children ? 'var(--spacing-1)' : 0,
            }}
          >
            {title}
          </div>
        )}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close alert"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: 'var(--spacing-1)',
            fontSize: 'var(--font-size-lg)',
            lineHeight: 1,
            opacity: 0.7,
            transition: 'opacity var(--transition-fast)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

