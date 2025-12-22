'use client';

import { useEffect } from 'react';

type ToastProps = {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
    duration?: number;
    icon?: React.ReactNode;
};

export default function Toast({ message, type, onClose, duration = 3000, icon }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const typeStyles = {
        success: {
            bg: 'var(--color-success-light)',
            text: 'var(--color-success-dark)',
            border: 'var(--color-success)',
            iconBg: 'var(--color-success)',
        },
        error: {
            bg: 'var(--color-error-light)',
            text: 'var(--color-error-dark)',
            border: 'var(--color-error)',
            iconBg: 'var(--color-error)',
        },
        warning: {
            bg: 'var(--color-warning-light)',
            text: 'var(--color-warning-dark)',
            border: 'var(--color-warning)',
            iconBg: 'var(--color-warning)',
        },
        info: {
            bg: 'var(--color-info-light)',
            text: 'var(--color-info-dark)',
            border: 'var(--color-info)',
            iconBg: 'var(--color-info)',
        },
    };

    const styles = typeStyles[type];

    const defaultIcon = icon || (
        type === 'success' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ) : type === 'error' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        ) : type === 'warning' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        )
    );

    return (
        <div
            className={`toast toast-${type}`}
            style={{
                padding: 'var(--spacing-3) var(--spacing-5)',
                background: styles.bg,
                color: styles.text,
                border: `1px solid ${styles.border}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                minWidth: '300px',
                maxWidth: '500px',
                pointerEvents: 'auto',
                animation: 'slideIn 0.3s ease-out',
            }}
            role="alert"
            aria-live="polite"
        >
            <div
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    background: styles.iconBg,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {defaultIcon}
            </div>
            <span style={{ 
                fontWeight: 'var(--font-weight-semibold)', 
                fontSize: 'var(--font-size-sm)',
                flex: 1,
            }}>
                {message}
            </span>
            <button
                onClick={onClose}
                style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    border: 'none',
                    color: styles.text,
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                    padding: 'var(--spacing-1)',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-base)',
                }}
                aria-label="Close"
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                }}
            >
                ×
            </button>
        </div>
    );
}

