'use client';

import { ReactNode, HTMLAttributes } from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  hover?: boolean;
  clickable?: boolean;
}

export default function Card({
  variant = 'default',
  header,
  footer,
  children,
  hover = false,
  clickable = false,
  className = '',
  onClick,
  ...props
}: CardProps) {
  const variantStyles = {
    default: {
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
    },
    elevated: {
      background: 'var(--bg-secondary)',
      border: 'none',
      boxShadow: 'var(--shadow-lg)',
    },
    outlined: {
      background: 'var(--bg-secondary)',
      border: '2px solid var(--border)',
      boxShadow: 'none',
    },
    flat: {
      background: 'var(--bg-secondary)',
      border: 'none',
      boxShadow: 'none',
    },
  };

  return (
    <div
      className={`ui-card ui-card-${variant} ${clickable ? 'ui-card-clickable' : ''} ${className}`}
      style={{
        ...variantStyles[variant],
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: hover || clickable ? 'all var(--transition-base) var(--ease-out)' : 'none',
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (hover || clickable) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover || clickable) {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow as string;
        }
      }}
      onClick={onClick}
      {...props}
    >
      {header && (
        <div
          className="ui-card-header"
          style={{
            padding: 'var(--spacing-6)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {header}
        </div>
      )}
      <div
        className="ui-card-body"
        style={{
          padding: header || footer ? 'var(--spacing-6)' : 'var(--spacing-6)',
        }}
      >
        {children}
      </div>
      {footer && (
        <div
          className="ui-card-footer"
          style={{
            padding: 'var(--spacing-6)',
            borderTop: '1px solid var(--border)',
            background: 'var(--color-neutral-50)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}


