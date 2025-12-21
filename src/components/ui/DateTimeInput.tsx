'use client';

import Input from './Input';

interface DateTimeInputProps {
  label?: string;
  name?: string;
  value?: string; // datetime-local format: YYYY-MM-DDTHH:mm
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function DateTimeInput({
  label,
  name,
  value = '',
  onChange,
  min,
  max,
  error,
  helperText,
  required,
  fullWidth,
  disabled,
  className = '',
}: DateTimeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      if (onChange) {
        onChange(e.target.value);
      }
    }
  };

  return (
    <div className={`ui-datetime-input ${fullWidth ? 'ui-datetime-input-full-width' : ''} ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
      <Input
        type="datetime-local"
        name={name}
        label={label}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        error={error}
        helperText={helperText}
        required={required}
        fullWidth={fullWidth}
        disabled={disabled}
      />
    </div>
  );
}

