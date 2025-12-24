'use client';

import { ReactNode } from 'react';
import Input from './Input';
import Select from './Select';
import Switch from './Switch';
import { SelectOption } from './Select';

type FormFieldType = 'input' | 'textarea' | 'select' | 'switch';

interface BaseFormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
}

interface InputFormFieldProps extends BaseFormFieldProps {
  type: 'input';
  inputType?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  step?: string;
}

interface TextareaFormFieldProps extends BaseFormFieldProps {
  type: 'textarea';
  rows?: number;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

interface SelectFormFieldProps extends BaseFormFieldProps {
  type: 'select';
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface SwitchFormFieldProps extends BaseFormFieldProps {
  type: 'switch';
  checked: boolean;
  onChange: (checked: boolean) => void;
}

type FormFieldProps = InputFormFieldProps | TextareaFormFieldProps | SelectFormFieldProps | SwitchFormFieldProps;

/**
 * FormField wrapper component for consistent form inputs
 * 
 * @example
 * <FormField
 *   type="input"
 *   label="Email"
 *   inputType="email"
 *   required
 *   error={errors.email}
 * />
 */
export default function FormField(props: FormFieldProps) {
  const { label, error, helperText, required, fullWidth } = props;

  if (props.type === 'input') {
    return (
      <Input
        label={label}
        type={props.inputType}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        error={error}
        helperText={helperText}
        required={required}
        fullWidth={fullWidth}
        leftIcon={props.leftIcon}
        rightIcon={props.rightIcon}
      />
    );
  }

  if (props.type === 'select') {
    return (
      <Select
        label={label}
        options={props.options}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        error={error}
        helperText={helperText}
        required={required}
        fullWidth={fullWidth}
      />
    );
  }

  if (props.type === 'textarea') {
    const textareaId = `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    return (
      <div className={`ui-formfield-wrapper ${fullWidth ? 'ui-formfield-full-width' : ''}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
        <label
          htmlFor={textareaId}
          className="ui-formfield-label"
          style={{
            display: 'block',
            marginBottom: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--text-primary)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-error)', marginLeft: 'var(--spacing-1)' }}>*</span>}
        </label>
        <textarea
          id={textareaId}
          rows={props.rows || 4}
          placeholder={props.placeholder}
          value={props.value}
          onChange={props.onChange}
          className="ui-formfield-textarea"
          style={{
            width: '100%',
            padding: 'var(--spacing-3) var(--spacing-4)',
            border: `1px solid ${hasError ? 'var(--color-error)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: 'var(--font-size-base)',
            transition: 'all var(--transition-base) var(--ease-out)',
            resize: 'vertical',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = hasError ? 'var(--color-error)' : 'var(--border-focus)';
            e.currentTarget.style.boxShadow = `0 0 0 3px ${hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(211, 47, 47, 0.1)'}`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasError ? 'var(--color-error)' : 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          aria-invalid={hasError}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
        />
        {error && (
          <div
            id={`${textareaId}-error`}
            className="ui-formfield-error"
            style={{
              marginTop: 'var(--spacing-2)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-error)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {helperText && !error && (
          <div
            id={`${textareaId}-helper`}
            className="ui-formfield-helper"
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

  if (props.type === 'switch') {
    return (
      <Switch
        checked={props.checked}
        onChange={props.onChange}
        label={label}
        helperText={helperText}
        error={error}
        fullWidth={fullWidth}
      />
    );
  }

  return null;
}







