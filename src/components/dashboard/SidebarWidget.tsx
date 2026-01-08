'use client';

import { ReactNode } from 'react';

export interface WidgetAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface SidebarWidgetProps {
  title: string;
  icon: ReactNode;
  iconBg: string;
  children: ReactNode;
  actions?: WidgetAction[];
  isLoading?: boolean;
  lastUpdated?: Date;
  onRefresh?: () => void;
}

/**
 * Widget Component - Matches OpsSentinal Slate Theme
 * Muted Executive Aesthetic with Professional Gradients
 */
export default function SidebarWidget({
  title,
  icon,
  iconBg,
  children,
  actions,
  isLoading,
  lastUpdated,
  onRefresh,
}: SidebarWidgetProps) {
  const getActionStyles = (variant: string = 'secondary') => {
    const baseStyles = {
      padding: '0.5rem 0.875rem',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--font-size-sm)',
      fontWeight: 'var(--font-weight-semibold)',
      cursor: 'pointer',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      transition: 'all var(--transition-base) var(--ease-out)',
      boxShadow: 'var(--shadow-xs)',
    };

    const variantStyles = {
      primary: {
        background: 'var(--primary-color)',
        color: 'var(--text-inverse)',
      },
      secondary: {
        background: 'var(--color-neutral-100)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
      },
      danger: {
        background: 'rgba(190, 18, 60, 0.1)',
        color: 'var(--color-error)',
        border: '1px solid rgba(190, 18, 60, 0.2)',
      },
    };

    return { ...baseStyles, ...variantStyles[variant as keyof typeof variantStyles] };
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: 'var(--spacing-6)',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {icon}
          </div>
          <h3
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              margin: 0,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            {title}
          </h3>
        </div>

        {/* Actions */}
        {(actions || onRefresh) && (
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            {onRefresh && (
              <button
                onClick={onRefresh}
                style={{
                  ...getActionStyles('secondary'),
                  padding: '0.5rem',
                  minWidth: 'auto',
                }}
                title="Refresh data"
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-neutral-200)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--color-neutral-100)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            {actions?.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                style={getActionStyles(action.variant)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                }}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Last Updated Indicator */}
      {lastUpdated && (
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--spacing-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            padding: '0.375rem 0.625rem',
            background: 'var(--color-neutral-100)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            width: 'fit-content',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-success)',
              boxShadow: '0 0 8px var(--color-success)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
            Updated {getTimeAgo(lastUpdated)}
          </span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div
          style={{
            padding: 'var(--spacing-10)',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--color-neutral-200)',
              borderTop: '3px solid var(--primary-color)',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ marginTop: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)' }}>
            Loading...
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Formats a Date object as a human-readable relative time string
 * Handles edge cases: invalid dates, future dates, very old dates
 */
function getTimeAgo(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'unknown';
  }

  const now = Date.now();
  const then = date.getTime();
  const diffMs = now - then;

  // Handle future dates
  if (diffMs < 0) {
    return 'just now';
  }

  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // For older dates, show actual date
  return date.toLocaleDateString();
}

// Icon backgrounds - solid colors for reliability
export const WIDGET_ICON_BG = {
  green: '#059669', // Success green
  blue: '#3b82f6', // Info blue
  orange: '#f59e0b', // Warning orange
  purple: '#8b5cf6', // Purple
  red: '#f43f5e', // Error rose
  slate: '#475569', // Slate
  cyan: '#0891b2', // Cyan
};

// Icon colors - white shows on colored backgrounds
export const WIDGET_ICON_COLOR = {
  green: '#ffffff',
  blue: '#ffffff',
  orange: '#ffffff',
  purple: '#ffffff',
  red: '#ffffff',
  slate: '#ffffff',
  cyan: '#ffffff',
};
