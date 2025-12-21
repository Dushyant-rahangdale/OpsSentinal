'use client';

import { ReactNode } from 'react';
import Checkbox from './Checkbox';

interface CheckboxOption {
  value: string;
  label: string;
  helperText?: string;
  disabled?: boolean;
}

interface CheckboxGroupProps {
  options: CheckboxOption[];
  value?: string[];
  onChange?: (values: string[]) => void;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function CheckboxGroup({
  options,
  value = [],
  onChange,
  label,
  error,
  helperText,
  required,
  fullWidth = false,
  className = '',
}: CheckboxGroupProps) {
  const groupId = `checkbox-group-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange?.([...value, optionValue]);
    } else {
      onChange?.(value.filter((v) => v !== optionValue));
    }
  };

  return (
    <div
      className={`ui-checkbox-group ${fullWidth ? 'ui-checkbox-group-full-width' : ''} ${className}`}
      style={{ width: fullWidth ? '100%' : 'auto' }}
      role="group"
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
          <Checkbox
            key={option.value}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
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

