'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

// Status Badge component
export function MobileStatusBadge({
  status,
  size = 'md',
}: {
  status: 'open' | 'acknowledged' | 'resolved' | 'snoozed' | 'suppressed';
  size?: 'sm' | 'md';
}) {
  const statusConfig = (() => {
    switch (status) {
      case 'open':
        return { bg: 'var(--badge-error-bg)', color: 'var(--badge-error-text)', label: 'Open' };
      case 'acknowledged':
        return {
          bg: 'var(--badge-warning-bg)',
          color: 'var(--badge-warning-text)',
          label: 'Acknowledged',
        };
      case 'resolved':
        return {
          bg: 'var(--badge-success-bg)',
          color: 'var(--badge-success-text)',
          label: 'Resolved',
        };
      case 'snoozed':
        return {
          bg: 'var(--badge-snoozed-bg)',
          color: 'var(--badge-snoozed-text)',
          label: 'Snoozed',
        };
      case 'suppressed':
        return {
          bg: 'var(--badge-neutral-bg)',
          color: 'var(--badge-neutral-text)',
          label: 'Suppressed',
        };
    }
  })();

  // ...

  const sizeStyles =
    size === 'sm'
      ? { padding: '0.15rem 0.4rem', fontSize: '0.6rem' }
      : { padding: '0.2rem 0.5rem', fontSize: '0.7rem' };

  return (
    <span
      style={{
        ...sizeStyles,
        background: statusConfig.bg,
        color: statusConfig.color,
        fontWeight: '700',
        borderRadius: '4px',
        textTransform: 'uppercase',
      }}
    >
      {statusConfig.label}
    </span>
  );
}

// Urgency Badge component
export function MobileUrgencyBadge({
  urgency,
  size = 'md',
}: {
  urgency: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
}) {
  const urgencyConfig = (() => {
    switch (urgency) {
      case 'high':
        return { bg: 'var(--badge-error-bg)', color: 'var(--badge-error-text)' };
      case 'medium':
        return { bg: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)' };
      case 'low':
        return { bg: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' };
    }
  })();

  const sizeStyles =
    size === 'sm'
      ? { padding: '0.1rem 0.35rem', fontSize: '0.55rem' }
      : { padding: '0.15rem 0.4rem', fontSize: '0.6rem' };

  return (
    <span
      style={{
        ...sizeStyles,
        background: urgencyConfig.bg,
        color: urgencyConfig.color,
        fontWeight: '700',
        borderRadius: '999px',
        textTransform: 'uppercase',
      }}
    >
      {urgency}
    </span>
  );
}

// Avatar component
export function MobileAvatar({
  name,
  src,
  size = 'md',
}: {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeStyle = (() => {
    switch (size) {
      case 'sm':
        return { size: 28, fontSize: '0.7rem' };
      case 'md':
        return { size: 36, fontSize: '0.85rem' };
      case 'lg':
        return { size: 48, fontSize: '1rem' };
      case 'xl':
        return { size: 64, fontSize: '1.25rem' };
    }
  })();
  const avatarStyle = {
    width: `${sizeStyle.size}px`,
    height: `${sizeStyle.size}px`,
    fontSize: sizeStyle.fontSize,
  };
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={sizeStyle.size}
        height={sizeStyle.size}
        style={{ borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <div
      style={{
        ...avatarStyle,
        borderRadius: '50%',
        background: 'var(--gradient-primary)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
      }}
    >
      {initials}
    </div>
  );
}

// Health Indicator
export function MobileHealthIndicator({
  status,
  size = 'md',
  pulse = true,
}: {
  status: 'healthy' | 'degraded' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}) {
  const color = (() => {
    switch (status) {
      case 'healthy':
        return '#16a34a';
      case 'degraded':
        return '#d97706';
      case 'critical':
        return '#dc2626';
    }
  })();
  const indicatorSize = (() => {
    switch (size) {
      case 'sm':
        return '8px';
      case 'md':
        return '10px';
      case 'lg':
        return '12px';
    }
  })();

  return (
    <span
      style={{
        display: 'inline-block',
        width: indicatorSize,
        height: indicatorSize,
        borderRadius: '50%',
        background: color,
        boxShadow: pulse ? `0 0 8px ${color}66` : 'none',
        animation: pulse && status !== 'healthy' ? 'pulse 2s infinite' : 'none',
      }}
    />
  );
}

// Progress Bar
export function MobileProgressBar({
  value,
  max = 100,
  variant = 'primary',
  showLabel = false,
  height = '6px',
}: {
  value: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  height?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const barColor = (() => {
    switch (variant) {
      case 'primary':
        return 'var(--primary-color)';
      case 'success':
        return '#16a34a';
      case 'warning':
        return '#d97706';
      case 'danger':
        return '#dc2626';
    }
  })();

  return (
    <div>
      <div
        style={{
          width: '100%',
          height,
          background: 'var(--border)',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: barColor,
            borderRadius: '999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {showLabel && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: '0.25rem',
            textAlign: 'right',
          }}
        >
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}

// Empty State component
export function MobileEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mobile-empty-state">
      {icon && <div className="mobile-empty-icon">{icon}</div>}
      <h3 className="mobile-empty-title">{title}</h3>
      {description && <p className="mobile-empty-desc">{description}</p>}
      {action && <div className="mobile-empty-actions">{action}</div>}
    </div>
  );
}

export function MobileEmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9.5 12.5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Skeleton Loader
export function MobileSkeleton({
  width = '100%',
  height = '1rem',
  variant = 'text',
  className = '',
}: {
  width?: string;
  height?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}) {
  const borderRadius = (() => {
    switch (variant) {
      case 'text':
        return '4px';
      case 'circular':
        return '50%';
      case 'rectangular':
        return '8px';
    }
  })();

  return (
    <div
      className={className}
      style={{
        width: variant === 'circular' ? height : width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

// Divider
export function MobileDivider({
  label,
  spacing = 'md',
}: {
  label?: string;
  spacing?: 'sm' | 'md' | 'lg';
}) {
  const spacingValue = (() => {
    switch (spacing) {
      case 'sm':
        return '0.5rem';
      case 'md':
        return '1rem';
      case 'lg':
        return '1.5rem';
    }
  })();

  if (label) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: `${spacingValue} 0`,
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
          {label}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        height: '1px',
        background: 'var(--border)',
        margin: `${spacingValue} 0`,
      }}
    />
  );
}
