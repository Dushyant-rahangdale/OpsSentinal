'use client';

import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import Input from './Input';

type FormFieldType = 'input' | 'textarea' | 'select';

interface BaseFormFieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
}

interface InputFormFieldProps extends BaseFormFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  type?: 'input';
  inputType?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

interface TextareaFormFieldProps extends BaseFormFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  type?: 'textarea';
  rows?: number;
}

interface SelectFormFieldProps extends BaseFormFieldProps, SelectHTMLAttributes<HTMLSelectElement> {
  type?: 'select';
  options: Array<{ value: string; label: string }>;
}

type FormFieldProps = InputFormFieldProps | TextareaFormFieldProps | SelectFormFieldProps;

export default function FormField(props: FormFieldProps) {
  const { label, helperText, error, required, fullWidth, type = 'input', ...rest } = props;

  const fieldId = `field-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  if (type === 'input') {
    const inputProps = rest as InputFormFieldProps;
    return (
      <Input
        label={label}
        helperText={helperText}
        error={error}
        leftIcon={inputProps.leftIcon}
        rightIcon={inputProps.rightIcon}
        size={inputProps.size}
        fullWidth={fullWidth}
        required={required}
        type={inputProps.inputType || 'text'}
        {...inputProps}
      />
    );
  }

  if (type === 'textarea') {
    const textareaProps = rest as TextareaFormFieldProps;
    return (
      <div className={`ui-form-field ${fullWidth ? 'ui-form-field-full-width' : ''}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <label
            htmlFor={fieldId}
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            {label}
            {required && <span style={{ color: 'var(--color-error)', marginLeft: '0.25rem' }}>*</span>}
          </label>
        )}
        <textarea
          id={fieldId}
          rows={textareaProps.rows || 4}
          className="ui-textarea"
          style={{
            width: '100%',
            padding: 'var(--spacing-3) var(--spacing-4)',
            border: `1px solid ${hasError ? 'var(--color-error)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: 'var(--font-size-base)',
            lineHeight: 'var(--line-height-normal)',
            transition: 'all var(--transition-base) var(--ease-out)',
            resize: 'vertical',
          }}
          aria-invalid={hasError}
          aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          {...textareaProps}
        />
        {error && (
          <div
            id={`${fieldId}-error`}
            style={{
              marginTop: '0.5rem',
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
            id={`${fieldId}-helper`}
            style={{
              marginTop: '0.5rem',
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

  if (type === 'select') {
    const selectProps = rest as SelectFormFieldProps;
    return (
      <div className={`ui-form-field ${fullWidth ? 'ui-form-field-full-width' : ''}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <label
            htmlFor={fieldId}
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            {label}
            {required && <span style={{ color: 'var(--color-error)', marginLeft: '0.25rem' }}>*</span>}
          </label>
        )}
        <select
          id={fieldId}
          className="ui-select"
          style={{
            width: '100%',
            padding: 'var(--spacing-3) var(--spacing-4)',
            border: `1px solid ${hasError ? 'var(--color-error)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: 'var(--font-size-base)',
            cursor: 'pointer',
            transition: 'all var(--transition-base) var(--ease-out)',
          }}
          aria-invalid={hasError}
          aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          {...selectProps}
        >
          {selectProps.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div
            id={`${fieldId}-error`}
            style={{
              marginTop: '0.5rem',
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
            id={`${fieldId}-helper`}
            style={{
              marginTop: '0.5rem',
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

  return null;
}

