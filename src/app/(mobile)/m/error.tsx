'use client';

import { useEffect } from 'react';
import MobileButton from '@/components/mobile/MobileButton';
import { logger } from '@/lib/logger';

export default function MobileError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.error('Mobile error boundary triggered', { error });
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
        }}>
            <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
            }}>
                😟
            </div>
            <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
            }}>
                Something went wrong
            </h2>
            <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                marginBottom: '1.5rem',
                maxWidth: '280px',
            }}>
                We encountered an error while loading this page.
            </p>
            <MobileButton
                onClick={reset}
                variant="primary"
            >
                Try Again
            </MobileButton>
        </div>
    );
}
