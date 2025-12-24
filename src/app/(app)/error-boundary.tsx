'use client';

import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ErrorState from '@/components/ui/ErrorState';

/**
 * Global error boundary wrapper for the app
 * Wraps the entire application to catch and handle errors
 */
export default function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <ErrorState
          title="Application Error"
          message="Something went wrong. Please refresh the page or contact support if the problem persists."
          onRetry={() => window.location.reload()}
        />
      }
      onError={(error, errorInfo) => {
        // Log error for debugging
        console.error('Application error:', error, errorInfo);
        // TODO: Send to error tracking service (e.g., Sentry)
      }}
    >
      {children}
    </ErrorBoundary>
  );
}







