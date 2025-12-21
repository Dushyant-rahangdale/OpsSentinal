'use client';

import { ReactNode } from 'react';
import Radio from './Radio';

interface RadioOption {
  value: string;
  label: string;
  helperText?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error,
  helperText,
  required,
  fullWidth = false,
  className = '',
}: RadioGroupProps) {
  const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      className={`ui-radio-group ${fullWidth ? 'ui-radio-group-full-width' : ''} ${className}`}
      style={{ width: fullWidth ? '100%' : 'auto' }}
      role="radiogroup"
      aria-labelledby={label ? `${groupId}-label` : undefined}
      aria-describedby={error ? `${groupId}-error` : helperText ? `${groupId}-helper` : undefined}
    >
      {label && (
        <div
          id={`${groupId}-label`}
          style={{
            marginBottom: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--color-error)', marginLeft: '0.25rem' }}>*</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange?.(e.target.value)}
            label={option.label}
            helperText={option.helperText}
            disabled={option.disabled}
            fullWidth={fullWidth}
          />
        ))}
      </div>
      {error && (
        <div
          id={`${groupId}-error`}
          style={{
            marginTop: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)',
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
          id={`${groupId}-helper`}
          style={{
            marginTop: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
          }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
}


