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
  value,
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
    if (!disabled && onChange) {
      onChange(e.target.value);
    }
  };

  // Use uncontrolled mode if value is provided but no onChange
  // Use controlled mode if both value and onChange are provided
  const inputProps: any = {
    type: "datetime-local",
    name,
    label,
    onChange: handleChange,
    min,
    max,
    error,
    helperText,
    required,
    fullWidth,
    disabled,
  };

  // Only add value/defaultValue if actually provided
  if (value !== undefined && value !== '') {
    if (onChange) {
      // Controlled mode
      inputProps.value = value;
    } else {
      // Uncontrolled mode with default
      inputProps.defaultValue = value;
    }
  }

  return (
    <div className={`ui-datetime-input ${fullWidth ? 'ui-datetime-input-full-width' : ''} ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
      <Input {...inputProps} />
    </div>
  );
}
