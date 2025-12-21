'use client';

import { ReactNode } from 'react';
import Spinner from './Spinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  message?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingOverlay({
  isLoading,
  children,
  message,
  spinnerSize = 'md',
  className = '',
}: LoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div
      className={`ui-loading-overlay ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-4)',
          zIndex: 'var(--z-fixed)',
          borderRadius: 'inherit',
        }}
      >
        <Spinner size={spinnerSize} variant="primary" />
        {message && (
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}


