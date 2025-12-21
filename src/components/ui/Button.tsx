'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: 600,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'all var(--transition-base) var(--ease-out)',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    fontFamily: 'inherit',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
  };

  const sizeStyles = {
    sm: {
      padding: '0.5rem 1rem',
      fontSize: 'var(--font-size-sm)',
      height: '32px',
    },
    md: {
      padding: '0.75rem 1.5rem',
      fontSize: 'var(--font-size-base)',
      height: '40px',
    },
    lg: {
      padding: '1rem 2rem',
      fontSize: 'var(--font-size-lg)',
      height: '48px',
    },
  };

  const variantStyles = {
    primary: {
      background: 'var(--primary)',
      color: 'white',
      boxShadow: 'var(--shadow-sm)',
    },
    secondary: {
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
    },
    danger: {
      background: 'var(--color-error)',
      color: 'white',
      boxShadow: 'var(--shadow-sm)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-primary)',
    },
    link: {
      background: 'transparent',
      color: 'var(--primary)',
      padding: '0.25rem 0.5rem',
      textDecoration: 'underline',
    },
  };

  const hoverStyles = {
    primary: {
      background: 'var(--primary-hover)',
      transform: 'translateY(-1px)',
      boxShadow: 'var(--shadow-md)',
    },
    secondary: {
      background: 'var(--color-neutral-100)',
      borderColor: 'var(--border-hover)',
      transform: 'translateY(-1px)',
      boxShadow: 'var(--shadow-md)',
    },
    danger: {
      background: 'var(--color-error-dark)',
      transform: 'translateY(-1px)',
      boxShadow: 'var(--shadow-md)',
    },
    ghost: {
      background: 'var(--color-neutral-100)',
    },
    link: {
      color: 'var(--primary-hover)',
    },
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`ui-button ui-button-${variant} ui-button-${size} ${className}`}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          Object.assign(e.currentTarget.style, hoverStyles[variant]);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.background = variantStyles[variant].background as string;
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow as string || 'none';
          e.currentTarget.style.borderColor = variantStyles[variant].border as string || '';
        }
      }}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="ui-button-icon-left">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ui-button-icon-right">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

