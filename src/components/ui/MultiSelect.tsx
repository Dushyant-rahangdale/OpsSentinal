'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import Input from './Input';

interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function MultiSelect({
  label,
  options,
  value = [],
  onChange,
  placeholder = 'Select options...',
  searchable = true,
  error,
  helperText,
  required,
  fullWidth,
  className = '',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange?.(value.filter((v) => v !== optionValue));
    } else {
      onChange?.([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(value.filter((v) => v !== optionValue));
  };

  return (
    <div
      ref={dropdownRef}
      className={`ui-multiselect ${fullWidth ? 'ui-multiselect-full-width' : ''} ${className}`}
      style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}
    >
      <div onClick={() => setIsOpen(!isOpen)}>
        <Input
          label={label}
          value=""
          readOnly
          placeholder={selectedOptions.length > 0 ? `${selectedOptions.length} selected` : placeholder}
          error={error}
          helperText={helperText}
          required={required}
          fullWidth={fullWidth}
          rightIcon={<span style={{ fontSize: '0.75rem' }}>▼</span>}
        />
      </div>
      {selectedOptions.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--spacing-2)',
            marginTop: 'var(--spacing-2)',
          }}
        >
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                padding: 'var(--spacing-1) var(--spacing-2)',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
              }}
            >
              {option.label}
              <button
                type="button"
                onClick={(e) => handleRemove(option.value, e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: 'var(--spacing-1)',
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 'var(--spacing-2)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 'var(--z-dropdown)',
            maxHeight: '300px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn var(--transition-base) var(--ease-out)',
          }}
        >
          {searchable && (
            <div style={{ padding: 'var(--spacing-2)', borderBottom: '1px solid var(--border)' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%',
                  padding: 'var(--spacing-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-sm)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '250px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: 'var(--spacing-4)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggle(option.value)}
                    disabled={option.disabled}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-3) var(--spacing-4)',
                      background: isSelected ? 'var(--color-neutral-100)' : 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: option.disabled ? 'not-allowed' : 'pointer',
                      color: option.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: 'var(--font-size-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                      transition: 'background-color var(--transition-fast)',
                      opacity: option.disabled ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!option.disabled && !isSelected) {
                        e.currentTarget.style.background = 'var(--color-neutral-50)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!option.disabled && !isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: '4px',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && (
                        <span style={{ color: 'white', fontSize: '0.75rem' }}>✓</span>
                      )}
                    </span>
                    {option.icon && <span>{option.icon}</span>}
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


