'use client';

import { ReactNode, HTMLAttributes } from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  hover?: boolean;
  children: ReactNode;
}

/**
 * Card component with header, body, and footer sections
 * 
 * @example
 * <Card variant="elevated" header={<h3>Title</h3>} footer={<button>Action</button>}>
 *   Content here
 * </Card>
 */
export default function Card({
  variant = 'default',
  header,
  footer,
  hover = false,
  children,
  className = '',
  style,
  ...props
}: CardProps) {
  const baseStyles: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    transition: hover ? 'all var(--transition-base) var(--ease-out)' : undefined,
  };

  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    default: {
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
    },
    elevated: {
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-lg)',
    },
    outlined: {
      border: '2px solid var(--border)',
      boxShadow: 'none',
    },
    flat: {
      border: 'none',
      boxShadow: 'none',
      background: 'transparent',
    },
  };

  const hoverStyles: React.CSSProperties = hover
    ? {
        boxShadow: 'var(--shadow-xl)',
        transform: 'translateY(-2px)',
      }
    : {};

  return (
    <div
      className={`ui-card ui-card-${variant} ${hover ? 'ui-card-hover' : ''} ${className}`}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hover) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          Object.assign(e.currentTarget.style, variantStyles[variant]);
        }
      }}
      {...props}
    >
      {header && (
        <div
          className="ui-card-header"
          style={{
            padding: 'var(--spacing-6)',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-primary)',
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
            background: 'var(--bg-primary)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

