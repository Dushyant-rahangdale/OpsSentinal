'use client';

import { CSSProperties } from 'react';

type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
  animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  animation = 'pulse',
}: SkeletonProps) {
  const baseStyles: CSSProperties = {
    display: 'inline-block',
    backgroundColor: 'var(--color-neutral-200)',
    borderRadius: variant === 'circular' ? '50%' : variant === 'rounded' ? 'var(--radius-md)' : '4px',
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined),
    animation: animation === 'pulse' ? 'skeleton-pulse 1.5s ease-in-out infinite' : 
               animation === 'wave' ? 'skeleton-wave 1.6s linear infinite' : 'none',
    ...style,
  };

  return (
    <span
      className={`ui-skeleton ui-skeleton-${variant} ${className}`}
      style={baseStyles}
      aria-label="Loading content"
    />
  );
}

// Add skeleton animations to globals.css
const skeletonStyles = `
@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes skeleton-wave {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.ui-skeleton-wave {
  background: linear-gradient(
    90deg,
    var(--color-neutral-200) 0px,
    var(--color-neutral-100) 40px,
    var(--color-neutral-200) 80px
  );
  background-size: 200px 100%;
}
`;

// Styles are now in globals.css - no need to inject

