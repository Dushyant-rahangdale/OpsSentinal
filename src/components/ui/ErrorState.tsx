'use client';

interface ErrorStateProps {
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showDetails?: boolean;
  details?: string;
}

export default function ErrorState({
  title = 'Error',
  message,
  errorCode,
  onRetry,
  onGoBack,
  showDetails = false,
  details,
}: ErrorStateProps) {
  return (
    <div
      className="ui-error-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-12)',
        textAlign: 'center',
        minHeight: '400px',
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--color-error-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--spacing-6)',
        }}
      >
        <span style={{ fontSize: '2.5rem' }}>⚠️</span>
      </div>

      <h2
        style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        {title}
      </h2>

      <p
        style={{
          fontSize: 'var(--font-size-base)',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--spacing-6)',
          maxWidth: '500px',
        }}
      >
        {message}
      </p>

      {errorCode && (
        <div
          style={{
            padding: 'var(--spacing-2) var(--spacing-4)',
            background: 'var(--color-neutral-100)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--spacing-6)',
            fontFamily: 'monospace',
          }}
        >
          Error Code: {errorCode}
        </div>
      )}

      {showDetails && details && (
        <details
          style={{
            marginBottom: 'var(--spacing-6)',
            textAlign: 'left',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            Technical Details
          </summary>
          <pre
            style={{
              padding: 'var(--spacing-4)',
              background: 'var(--color-neutral-100)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              overflow: 'auto',
              fontFamily: 'monospace',
            }}
          >
            {details}
          </pre>
        </details>
      )}

      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-4)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {onRetry && (
          <button
            onClick={onRetry}
            className="glass-button primary"
            style={{
              padding: 'var(--spacing-3) var(--spacing-6)',
            }}
          >
            Try Again
          </button>
        )}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="glass-button"
            style={{
              padding: 'var(--spacing-3) var(--spacing-6)',
            }}
          >
            Go Back
          </button>
        )}
        <a
          href="mailto:support@opsguard.com"
          className="glass-button"
          style={{
            padding: 'var(--spacing-3) var(--spacing-6)',
            textDecoration: 'none',
          }}
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}


