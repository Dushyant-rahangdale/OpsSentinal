'use client';

import { ReactNode, CSSProperties } from 'react';

type MobileCardProps = {
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    onClick?: () => void;
    className?: string;
    style?: CSSProperties;
};

const paddingSizes = {
    none: '0',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
};

const variantStyles: Record<string, CSSProperties> = {
    default: {
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    elevated: {
        background: 'var(--bg-secondary)',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
    },
    outlined: {
        background: 'transparent',
        border: '1px solid var(--border)',
        boxShadow: 'none',
    },
    gradient: {
        background: 'var(--gradient-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    },
};

export default function MobileCard({
    children,
    variant = 'default',
    padding = 'md',
    onClick,
    className = '',
    style = {},
}: MobileCardProps) {
    const baseStyles: CSSProperties = {
        borderRadius: '12px',
        padding: paddingSizes[padding],
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...variantStyles[variant],
        ...style,
    };

    return (
        <div
            className={`mobile-card ${className}`}
            style={baseStyles}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}

// Card Header sub-component
export function MobileCardHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: subtitle ? '0.5rem' : '0.75rem',
        }}>
            <div>
                <h3 style={{
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0,
                }}>
                    {title}
                </h3>
                {subtitle && (
                    <p style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        margin: '0.25rem 0 0',
                    }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

// Card Section sub-component
export function MobileCardSection({
    children,
    noPadding = false,
}: {
    children: ReactNode;
    noPadding?: boolean;
}) {
    return (
        <div style={{
            padding: noPadding ? 0 : '0.75rem 0',
            borderTop: '1px solid var(--border)',
        }}>
            {children}
        </div>
    );
}
