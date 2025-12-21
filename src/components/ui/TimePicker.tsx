'use client';

import { useState, useRef, useEffect } from 'react';
import Input from './Input';

interface TimePickerProps {
  label?: string;
  value?: string; // HH:mm format
  onChange?: (time: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function TimePicker({
  label,
  value,
  onChange,
  error,
  helperText,
  required,
  fullWidth,
  className = '',
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(value || '');
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [isAM, setIsAM] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (h !== undefined && m !== undefined) {
        setHours(h > 12 ? h - 12 : h === 0 ? 12 : h);
        setMinutes(m);
        setIsAM(h < 12);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
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

  const formatTime = (h: number, m: number, am: boolean): string => {
    const hour24 = am ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    return `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleTimeChange = (newHours: number, newMinutes: number, newAM: boolean) => {
    setHours(newHours);
    setMinutes(newMinutes);
    setIsAM(newAM);
    const timeString = formatTime(newHours, newMinutes, newAM);
    setSelectedTime(timeString);
    onChange?.(timeString);
  };

  const displayTime = selectedTime
    ? (() => {
        const [h, m] = selectedTime.split(':').map(Number);
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${hour12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      })()
    : '';

  return (
    <div className={`ui-timepicker-wrapper ${fullWidth ? 'ui-timepicker-full-width' : ''} ${className}`} style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <Input
        label={label}
        value={displayTime}
        readOnly
        placeholder="Select time"
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
            🕐
          </button>
        }
      />
      {isOpen && (
        <div
          ref={pickerRef}
          className="ui-timepicker-picker"
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
            minWidth: '200px',
            animation: 'fadeIn var(--transition-base) var(--ease-out)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-4)',
            }}
          >
            {/* Hours */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Hour</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-1)',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  padding: 'var(--spacing-2)',
                }}
              >
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleTimeChange(h, minutes, isAM)}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-3)',
                      background: hours === h ? 'var(--primary)' : 'transparent',
                      color: hours === h ? 'white' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: hours === h ? 600 : 400,
                      minWidth: '50px',
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Min</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-1)',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  padding: 'var(--spacing-2)',
                }}
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleTimeChange(hours, m, isAM)}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-3)',
                      background: minutes === m ? 'var(--primary)' : 'transparent',
                      color: minutes === m ? 'white' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: minutes === m ? 600 : 400,
                      minWidth: '50px',
                    }}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Period</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
                <button
                  type="button"
                  onClick={() => handleTimeChange(hours, minutes, true)}
                  style={{
                    padding: 'var(--spacing-2) var(--spacing-3)',
                    background: isAM ? 'var(--primary)' : 'transparent',
                    color: isAM ? 'white' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: isAM ? 600 : 400,
                  }}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeChange(hours, minutes, false)}
                  style={{
                    padding: 'var(--spacing-2) var(--spacing-3)',
                    background: !isAM ? 'var(--primary)' : 'transparent',
                    color: !isAM ? 'white' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: !isAM ? 600 : 400,
                  }}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 'var(--spacing-4)',
              paddingTop: 'var(--spacing-4)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="glass-button"
              style={{ padding: 'var(--spacing-2) var(--spacing-4)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


