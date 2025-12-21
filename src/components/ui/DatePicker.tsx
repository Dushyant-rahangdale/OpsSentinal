'use client';

import { useState, useRef, useEffect } from 'react';
import Input from './Input';

interface DatePickerProps {
  label?: string;
  value?: string;
  onChange?: (date: string) => void;
  min?: string;
  max?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  error,
  helperText,
  required,
  fullWidth,
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || '');
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (date: Date) => {
    const dateString = formatDate(date);
    setSelectedDate(dateString);
    onChange?.(dateString);
    setIsOpen(false);
  };

  const getCalendarDays = () => {
    const today = selectedDate ? new Date(selectedDate) : new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return formatDate(date) === selectedDate;
  };

  const isDisabled = (date: Date): boolean => {
    if (min && formatDate(date) < min) return true;
    if (max && formatDate(date) > max) return true;
    return false;
  };

  const getMonthYear = () => {
    if (!selectedDate) {
      const today = new Date();
      return { month: today.getMonth(), year: today.getFullYear() };
    }
    const date = new Date(selectedDate);
    return { month: date.getMonth(), year: date.getFullYear() };
  };

  const { month, year } = getMonthYear();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(year, month + (direction === 'next' ? 1 : -1), 1);
    setSelectedDate(formatDate(newDate));
  };

  return (
    <div className={`ui-datepicker-wrapper ${fullWidth ? 'ui-datepicker-full-width' : ''} ${className}`} style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <Input
        label={label}
        value={selectedDate}
        onChange={(e) => {
          setSelectedDate(e.target.value);
          onChange?.(e.target.value);
        }}
        type="date"
        error={error}
        helperText={helperText}
        required={required}
        fullWidth={fullWidth}
        rightIcon={
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            📅
          </button>
        }
      />
      {isOpen && (
        <div
          ref={calendarRef}
          className="ui-datepicker-calendar"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 'var(--spacing-2)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            padding: 'var(--spacing-4)',
            zIndex: 'var(--z-dropdown)',
            minWidth: '300px',
            animation: 'fadeIn var(--transition-base) var(--ease-out)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--spacing-2)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            >
              ←
            </button>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>
              {monthNames[month]} {year}
            </div>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--spacing-2)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            >
              →
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 'var(--spacing-1)',
            }}
          >
            {dayNames.map((day) => (
              <div
                key={day}
                style={{
                  padding: 'var(--spacing-2)',
                  textAlign: 'center',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                {day}
              </div>
            ))}
            {getCalendarDays().map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} />;
              }

              const disabled = isDisabled(date);
              const selected = isSelected(date);
              const today = isToday(date);

              return (
                <button
                  key={formatDate(date)}
                  type="button"
                  onClick={() => !disabled && handleDateSelect(date)}
                  disabled={disabled}
                  style={{
                    padding: 'var(--spacing-2)',
                    background: selected ? 'var(--primary)' : today ? 'var(--color-neutral-200)' : 'transparent',
                    color: selected ? 'white' : disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: today ? 600 : 400,
                    opacity: disabled ? 0.4 : 1,
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !selected) {
                      e.currentTarget.style.background = 'var(--color-neutral-100)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled && !selected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

