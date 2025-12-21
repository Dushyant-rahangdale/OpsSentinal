'use client';

import { useState, KeyboardEvent, ReactNode } from 'react';
import Input from './Input';

interface TagInputProps {
  label?: string;
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  maxTags?: number;
  className?: string;
}

export default function TagInput({
  label,
  value = [],
  onChange,
  placeholder = 'Type and press Enter...',
  error,
  helperText,
  required,
  fullWidth,
  maxTags,
  className = '',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!maxTags || value.length < maxTags) {
        if (!value.includes(inputValue.trim())) {
          onChange?.([...value, inputValue.trim()]);
        }
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange?.(value.slice(0, -1));
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onChange?.(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className={`ui-tag-input ${fullWidth ? 'ui-tag-input-full-width' : ''} ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
      <Input
        label={label}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        error={error}
        helperText={helperText}
        required={required}
        fullWidth={fullWidth}
        disabled={maxTags ? value.length >= maxTags : false}
      />
      {value.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--spacing-2)',
            marginTop: 'var(--spacing-2)',
          }}
        >
          {value.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                padding: 'var(--spacing-1) var(--spacing-3)',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: 'var(--spacing-1)',
                  fontSize: 'var(--font-size-base)',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {maxTags && (
        <div
          style={{
            marginTop: 'var(--spacing-2)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
          }}
        >
          {value.length} / {maxTags} tags
        </div>
      )}
    </div>
  );
}


