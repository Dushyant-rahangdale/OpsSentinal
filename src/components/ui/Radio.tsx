'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

export default function Radio({
  label,
  helperText,
  error,
  fullWidth = false,
  className = '',
  id,
  ...props
}: RadioProps) {
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  return (
    <div
      className={`ui-radio-wrapper ${fullWidth ? 'ui-radio-full-width' : ''}`}
      style={{ width: fullWidth ? '100%' : 'auto' }}
    >
      <label
        htmlFor={radioId}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-2)',
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          opacity: props.disabled ? 0.6 : 1,
        }}
      >
        <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
          <input
            id={radioId}
            type="radio"
            className={`ui-radio ${className}`}
            style={{
              width: '18px',
              height: '18px',
              cursor: props.disabled ? 'not-allowed' : 'pointer',
              accentColor: hasError ? 'var(--color-error)' : 'var(--primary)',
            }}
            aria-invalid={hasError}
            aria-describedby={error ? `${radioId}-error` : helperText ? `${radioId}-helper` : undefined}
            {...props}
          />
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
              id={`${radioId}-error`}
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
              id={`${radioId}-helper`}
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


