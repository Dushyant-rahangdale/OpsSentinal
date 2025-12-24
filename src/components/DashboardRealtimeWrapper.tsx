'use client';

import { useRealtime } from '@/hooks/useRealtime';
import { useEffect } from 'react';

type DashboardRealtimeWrapperProps = {
    children: React.ReactNode;
};

export default function DashboardRealtimeWrapper({ 
    children
}: DashboardRealtimeWrapperProps) {
    const { isConnected, error } = useRealtime();

    // Add pulse animation to CSS if not already present
    useEffect(() => {
        if (typeof document !== 'undefined' && !document.getElementById('realtime-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'realtime-pulse-style';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <>
            {children}
            {isConnected && !error && (
                <div 
                    role="status"
                    aria-live="polite"
                    aria-label="Real-time updates active"
                    style={{
                        position: 'fixed',
                        bottom: '1rem',
                        right: '1rem',
                        padding: '0.5rem 1rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: 'var(--shadow-md)',
                        zIndex: 1000,
                    }}
                >
                    <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--color-success)',
                        animation: 'pulse 2s ease-in-out infinite'
                    }} aria-hidden="true" />
                    <span style={{ color: 'var(--text-secondary)' }}>Live updates active</span>
                </div>
            )}
        </>
    );
}

