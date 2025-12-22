'use client';

import { ReactNode } from 'react';
import { Skeleton, SkeletonCard, SkeletonText } from './Skeleton';
import { Spinner } from './Spinner';

interface LoadingWrapperProps {
  isLoading: boolean;
  children: ReactNode;
  skeleton?: 'default' | 'card' | 'text' | 'custom';
  customSkeleton?: ReactNode;
  spinner?: boolean;
  spinnerSize?: 'sm' | 'md' | 'lg';
  minHeight?: string;
}

/**
 * LoadingWrapper component for handling loading states
 * 
 * @example
 * <LoadingWrapper isLoading={loading} skeleton="card">
 *   <YourContent />
 * </LoadingWrapper>
 */
export default function LoadingWrapper({
  isLoading,
  children,
  skeleton = 'default',
  customSkeleton,
  spinner = false,
  spinnerSize = 'md',
  minHeight = '200px',
}: LoadingWrapperProps) {
  if (isLoading) {
    if (spinner) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight,
            padding: 'var(--spacing-8)',
          }}
        >
          <Spinner size={spinnerSize} variant="primary" />
        </div>
      );
    }

    if (customSkeleton) {
      return <>{customSkeleton}</>;
    }

    switch (skeleton) {
      case 'card':
        return <SkeletonCard />;
      case 'text':
        return <SkeletonText lines={3} />;
      case 'custom':
        return <>{customSkeleton}</>;
      default:
        return (
          <div style={{ minHeight, padding: 'var(--spacing-4)' }}>
            <Skeleton variant="rectangular" width="100%" height={minHeight} />
          </div>
        );
    }
  }

  return <>{children}</>;
}

