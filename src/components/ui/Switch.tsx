'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

export default function Switch({
  label,
  helperText,
  error,
  fullWidth = false,
  className = '',
  id,
  ...props
}: SwitchProps) {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  return (
    <div
      className={`ui-switch-wrapper ${fullWidth ? 'ui-switch-full-width' : ''}`}
      style={{ width: fullWidth ? '100%' : 'auto' }}
    >
      <label
        htmlFor={switchId}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-3)',
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          opacity: props.disabled ? 0.6 : 1,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '44px',
            height: '24px',
            flexShrink: 0,
          }}
        >
          <input
            id={switchId}
            type="checkbox"
            className={`ui-switch ${className}`}
            style={{
              position: 'absolute',
              opacity: 0,
              width: 0,
              height: 0,
            }}
            aria-invalid={hasError}
            aria-describedby={error ? `${switchId}-error` : helperText ? `${switchId}-helper` : undefined}
            {...props}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: props.checked ? (hasError ? 'var(--color-error)' : 'var(--primary)') : 'var(--color-neutral-300)',
              borderRadius: 'var(--radius-full)',
              transition: 'background-color var(--transition-base) var(--ease-out)',
              cursor: props.disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: props.checked ? '22px' : '2px',
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '50%',
                boxShadow: 'var(--shadow-sm)',
                transition: 'left var(--transition-base) var(--ease-out)',
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {label && (
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: helperText || error ? 'var(--spacing-1)' : 0,
              }}
            >
              {label}
              {props.required && (
                <span style={{ color: 'var(--color-error)', marginLeft: '0.25rem' }}>*</span>
              )}
            </div>
          )}
          {error && (
            <div
              id={`${switchId}-error`}
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {helperText && !error && (
            <div
              id={`${switchId}-helper`}
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-muted)',
              }}
            >
              {helperText}
            </div>
          )}
        </div>
      </label>
    </div>
  );
}


