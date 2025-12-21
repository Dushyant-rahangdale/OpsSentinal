'use client';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerVariant = 'default' | 'primary' | 'white';

interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}

export default function Spinner({ size = 'md', variant = 'default', className = '' }: SpinnerProps) {
  const sizeStyles = {
    sm: { width: '16px', height: '16px', borderWidth: '2px' },
    md: { width: '24px', height: '24px', borderWidth: '3px' },
    lg: { width: '32px', height: '32px', borderWidth: '4px' },
  };

  const variantStyles = {
    default: {
      borderTopColor: 'var(--text-primary)',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    primary: {
      borderTopColor: 'var(--primary)',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    white: {
      borderTopColor: 'white',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
  };

  return (
    <div
      className={`ui-spinner ${className}`}
      style={{
        ...sizeStyles[size],
        borderStyle: 'solid',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        ...variantStyles[variant],
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}


