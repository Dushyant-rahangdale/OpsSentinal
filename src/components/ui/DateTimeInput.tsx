'use client';

import { useState, useEffect } from 'react';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

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
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Parse datetime-local format (YYYY-MM-DDTHH:mm) into date and time
  useEffect(() => {
    if (value) {
      const [datePart, timePart] = value.split('T');
      setDate(datePart || '');
      setTime(timePart || '');
    } else {
      setDate('');
      setTime('');
    }
  }, [value]);

  // Combine date and time into datetime-local format
  useEffect(() => {
    if (date && time) {
      const datetime = `${date}T${time}`;
      if (onChange) {
        onChange(datetime);
      }
    } else if (!date && !time && onChange) {
      onChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
  };

  const minDate = min ? min.split('T')[0] : undefined;
  const maxDate = max ? max.split('T')[0] : undefined;

  const datetimeValue = date && time ? `${date}T${time}` : '';

  return (
    <div className={`ui-datetime-input ${fullWidth ? 'ui-datetime-input-full-width' : ''} ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
      {name && <input type="hidden" name={name} value={datetimeValue} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
        <div>
          <DatePicker
            label={label ? `${label} - Date` : undefined}
            value={date}
            onChange={handleDateChange}
            min={minDate}
            max={maxDate}
            error={error}
            fullWidth
            required={required}
          />
        </div>
        <div>
          <TimePicker
            label={label ? `${label} - Time` : undefined}
            value={time}
            onChange={handleTimeChange}
            error={error}
            fullWidth
            required={required}
          />
        </div>
      </div>
      {error && (
        <div
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

