'use client';

import { ReactNode, CSSProperties } from 'react';

// Status Badge component
export function MobileStatusBadge({
    status,
    size = 'md',
}: {
    status: 'open' | 'acknowledged' | 'resolved' | 'snoozed' | 'suppressed';
    size?: 'sm' | 'md';
}) {
    const statusConfig = {
        open: { bg: 'var(--badge-error-bg)', color: 'var(--badge-error-text)', label: 'Open' },
        acknowledged: { bg: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', label: 'Acknowledged' },
        resolved: { bg: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', label: 'Resolved' },
        snoozed: { bg: 'var(--badge-snoozed-bg)', color: 'var(--badge-snoozed-text)', label: 'Snoozed' },
        suppressed: { bg: 'var(--badge-neutral-bg)', color: 'var(--badge-neutral-text)', label: 'Suppressed' },
    };

    // ...

    const sizeStyles = size === 'sm'
        ? { padding: '0.15rem 0.4rem', fontSize: '0.6rem' }
        : { padding: '0.2rem 0.5rem', fontSize: '0.7rem' };

    return (
        <span style={{
            ...sizeStyles,
            background: statusConfig[status].bg,
            color: statusConfig[status].color,
            fontWeight: '700',
            borderRadius: '4px',
            textTransform: 'uppercase',
        }}>
            {statusConfig[status].label}
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
    const urgencyConfig = {
        high: { bg: 'var(--badge-error-bg)', color: 'var(--badge-error-text)' },
        medium: { bg: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)' },
        low: { bg: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' },
    };

    const sizeStyles = size === 'sm'
        ? { padding: '0.1rem 0.35rem', fontSize: '0.55rem' }
        : { padding: '0.15rem 0.4rem', fontSize: '0.6rem' };

    return (
        <span style={{
            ...sizeStyles,
            background: urgencyConfig[urgency].bg,
            color: urgencyConfig[urgency].color,
            fontWeight: '700',
            borderRadius: '999px',
            textTransform: 'uppercase',
        }}>
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
    const sizes = {
        sm: { width: '28px', height: '28px', fontSize: '0.7rem' },
        md: { width: '36px', height: '36px', fontSize: '0.85rem' },
        lg: { width: '48px', height: '48px', fontSize: '1rem' },
        xl: { width: '64px', height: '64px', fontSize: '1.25rem' },
    };

    const sizeStyle = sizes[size];
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                style={{
                    ...sizeStyle,
                    borderRadius: '50%',
                    objectFit: 'cover',
                }}
            />
        );
    }

    return (
        <div style={{
            ...sizeStyle,
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
        }}>
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
    const colors = {
        healthy: '#16a34a',
        degraded: '#d97706',
        critical: '#dc2626',
    };

    const sizes = {
        sm: '8px',
        md: '10px',
        lg: '12px',
    };

    return (
        <span style={{
            display: 'inline-block',
            width: sizes[size],
            height: sizes[size],
            borderRadius: '50%',
            background: colors[status],
            boxShadow: pulse ? `0 0 8px ${colors[status]}66` : 'none',
            animation: pulse && status !== 'healthy' ? 'pulse 2s infinite' : 'none',
        }} />
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

    const colors = {
        primary: 'var(--primary)',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
    };

    return (
        <div>
            <div style={{
                width: '100%',
                height,
                background: 'var(--border)',
                borderRadius: '999px',
                overflow: 'hidden',
            }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: colors[variant],
                    borderRadius: '999px',
                    transition: 'width 0.3s ease',
                }} />
            </div>
            {showLabel && (
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.25rem',
                    textAlign: 'right',
                }}>
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
        <div style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid var(--border)',
        }}>
            {icon && (
                <div style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                }}>
                    {icon}
                </div>
            )}
            <h3 style={{
                margin: '0 0 0.5rem',
                fontSize: '1rem',
                fontWeight: '700',
            }}>
                {title}
            </h3>
            {description && (
                <p style={{
                    margin: '0 0 1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                }}>
                    {description}
                </p>
            )}
            {action}
        </div>
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
    const borderRadius = {
        text: '4px',
        circular: '50%',
        rectangular: '8px',
    };

    return (
        <div
            className={className}
            style={{
                width: variant === 'circular' ? height : width,
                height,
                borderRadius: borderRadius[variant],
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
    const spacings = {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
    };

    if (label) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                margin: `${spacings[spacing]} 0`,
            }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {label}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>
        );
    }

    return (
        <div style={{
            height: '1px',
            background: 'var(--border)',
            margin: `${spacings[spacing]} 0`,
        }} />
    );
}
