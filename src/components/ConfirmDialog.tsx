'use client';

import { useEffect } from 'react';

type ConfirmDialogProps = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
};

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'danger'
}: ConfirmDialogProps) {
    useEffect(() => {
        if (isOpen) {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onCancel();
                }
            };
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            return () => {
                document.removeEventListener('keydown', handleEscape);
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            confirmBg: 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)',
            confirmColor: '#b91c1c',
            confirmBorder: '#fecaca',
            icon: '⚠️'
        },
        warning: {
            confirmBg: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
            confirmColor: '#78350f',
            confirmBorder: '#fde68a',
            icon: '⚠️'
        },
        info: {
            confirmBg: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)',
            confirmColor: '#1e40af',
            confirmBorder: '#bfdbfe',
            icon: 'ℹ️'
        }
    };

    const styles = variantStyles[variant];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '1rem'
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    border: '1px solid #e2e8f0'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{styles.icon}</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        {title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        {message}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        className="glass-button"
                        style={{
                            padding: '0.6rem 1.25rem',
                            border: '1px solid var(--border)'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.6rem 1.25rem',
                            background: styles.confirmBg,
                            color: styles.confirmColor,
                            border: `1px solid ${styles.confirmBorder}`,
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

