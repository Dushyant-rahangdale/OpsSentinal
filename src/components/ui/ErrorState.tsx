'use client';

import { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showDetails?: boolean;
  details?: string;
  icon?: ReactNode;
}

/**
 * ErrorState component for displaying error messages with actions
 * 
 * @example
 * <ErrorState
 *   title="Failed to load data"
 *   message="Please try again"
 *   onRetry={() => refetch()}
 * />
 */
export default function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while processing your request.',
  errorCode,
  onRetry,
  onGoBack,
  showDetails = false,
  details,
  icon,
}: ErrorStateProps) {
  return (
    <div
      className="error-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-12) var(--spacing-6)',
        textAlign: 'center',
        minHeight: '400px',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
        }}
      >
        {/* Icon */}
        {icon || (
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-6)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-error)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        )}

        {/* Title */}
        <h2
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--spacing-6)',
            lineHeight: 'var(--line-height-relaxed)',
          }}
        >
          {message}
        </p>

        {/* Error Code */}
        {errorCode && (
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--spacing-6)',
              fontFamily: 'monospace',
              padding: 'var(--spacing-2) var(--spacing-3)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'inline-block',
            }}
          >
            Error Code: {errorCode}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-3)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {onRetry && (
            <button
              onClick={onRetry}
              className="glass-button primary"
              style={{
                padding: 'var(--spacing-3) var(--spacing-6)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-base) var(--ease-out)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              Try Again
            </button>
          )}

          {onGoBack && (
            <button
              onClick={onGoBack}
              className="glass-button"
              style={{
                padding: 'var(--spacing-3) var(--spacing-6)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-base) var(--ease-out)',
                color: 'var(--text-primary)',
              }}
            >
              Go Back
            </button>
          )}
        </div>

        {/* Details */}
        {showDetails && details && (
          <details
            style={{
              marginTop: 'var(--spacing-6)',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-2)',
                userSelect: 'none',
              }}
            >
              Show Details
            </summary>
            <pre
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-muted)',
                padding: 'var(--spacing-4)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                overflow: 'auto',
                maxHeight: '300px',
                fontFamily: 'monospace',
                lineHeight: 'var(--line-height-relaxed)',
              }}
            >
              {details}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

