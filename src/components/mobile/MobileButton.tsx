'use client';

import { ReactNode, ButtonHTMLAttributes, CSSProperties } from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type MobileButtonProps = {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    href?: string;
    className?: string;
    style?: CSSProperties;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'>;

const variantStyles: Record<ButtonVariant, CSSProperties> = {
    primary: {
        background: 'var(--gradient-primary)',
        color: 'white',
        border: 'none',
        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
    },
    secondary: {
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        boxShadow: 'none',
    },
    danger: {
        background: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        boxShadow: 'none',
    },
    success: {
        background: '#dcfce7',
        color: '#16a34a',
        border: 'none',
        boxShadow: 'none',
    },
    warning: {
        background: '#fef3c7',
        color: '#d97706',
        border: 'none',
        boxShadow: 'none',
    },
    ghost: {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: 'none',
        boxShadow: 'none',
    },
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
    sm: {
        padding: '0.5rem 0.875rem',
        fontSize: '0.8rem',
        borderRadius: '8px',
    },
    md: {
        padding: '0.75rem 1.25rem',
        fontSize: '0.875rem',
        borderRadius: '10px',
    },
    lg: {
        padding: '1rem 1.5rem',
        fontSize: '1rem',
        borderRadius: '12px',
    },
};

export default function MobileButton({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    icon,
    iconPosition = 'left',
    loading = false,
    href,
    className = '',
    style = {},
    disabled,
    ...props
}: MobileButtonProps) {
    const baseStyles: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontWeight: '600',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease',
        width: fullWidth ? '100%' : 'auto',
        textDecoration: 'none',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
    };

    const content = (
        <>
            {loading ? (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    <LoadingSpinner />
                </span>
            ) : (
                <>
                    {icon && iconPosition === 'left' && <span style={{ display: 'flex' }}>{icon}</span>}
                    <span>{children}</span>
                    {icon && iconPosition === 'right' && <span style={{ display: 'flex' }}>{icon}</span>}
                </>
            )}
        </>
    );

    if (href && !disabled) {
        return (
            <Link href={href} className={className} style={baseStyles}>
                {content}
            </Link>
        );
    }

    return (
        <button
            className={className}
            style={baseStyles}
            disabled={disabled || loading}
            {...props}
        >
            {content}
        </button>
    );
}

function LoadingSpinner() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ animation: 'spin 1s linear infinite' }}
        >
            <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="28"
                strokeDashoffset="8"
            />
        </svg>
    );
}

// Icon Button variant
export function MobileIconButton({
    icon,
    variant = 'ghost',
    size = 'md',
    badge,
    ...props
}: {
    icon: ReactNode;
    badge?: number | string;
} & Omit<MobileButtonProps, 'children'>) {
    const iconSizes: Record<ButtonSize, CSSProperties> = {
        sm: { padding: '0.5rem', width: '36px', height: '36px' },
        md: { padding: '0.625rem', width: '42px', height: '42px' },
        lg: { padding: '0.75rem', width: '48px', height: '48px' },
    };

    return (
        <div style={{ position: 'relative', display: 'inline-flex' }}>
            <MobileButton
                variant={variant}
                size={size}
                style={{ ...iconSizes[size], borderRadius: '50%' }}
                {...props}
            >
                {icon}
            </MobileButton>
            {badge !== undefined && (
                <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 5px',
                    background: '#dc2626',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {badge}
                </span>
            )}
        </div>
    );
}
