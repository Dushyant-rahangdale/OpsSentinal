'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
  fullWidth?: boolean;
}

export default function Checkbox({
  label,
  helperText,
  error,
  indeterminate,
  fullWidth = false,
  className = '',
  id,
  ...props
}: CheckboxProps) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  return (
    <div
      className={`ui-checkbox-wrapper ${fullWidth ? 'ui-checkbox-full-width' : ''}`}
      style={{ width: fullWidth ? '100%' : 'auto' }}
    >
      <label
        htmlFor={checkboxId}
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
            id={checkboxId}
            type="checkbox"
            className={`ui-checkbox ${className}`}
            style={{
              width: '18px',
              height: '18px',
              cursor: props.disabled ? 'not-allowed' : 'pointer',
              accentColor: hasError ? 'var(--color-error)' : 'var(--primary)',
            }}
            ref={(el) => {
              if (el && indeterminate !== undefined) {
                el.indeterminate = indeterminate;
              }
            }}
            aria-invalid={hasError}
            aria-describedby={error ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined}
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
              id={`${checkboxId}-error`}
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
              id={`${checkboxId}-helper`}
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

