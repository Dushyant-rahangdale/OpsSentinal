'use client';

import { useState, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MobileSearchProps = {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  suggestions?: string[];
  leftIcon?: ReactNode;
  rightAction?: ReactNode;
  autoFocus?: boolean;
};

export default function MobileSearch({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  onSearch,
  suggestions = [],
  leftIcon,
  rightAction,
  autoFocus = false,
}: MobileSearchProps) {
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const filteredSuggestions = suggestions
    .filter(s => s.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 5);
  const showSuggestions = isFocused && value.length > 0 && filteredSuggestions.length > 0;

  const handleChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    handleChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'mobile-search flex items-center gap-3 rounded-xl border-2 border-[color:var(--border)] px-4 py-3 transition',
            isFocused && 'mobile-search--focused'
          )}
          data-focused={isFocused ? 'true' : 'false'}
        >
          {leftIcon || (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mobile-search-icon"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="mobile-search-input flex-1 bg-transparent text-sm font-medium focus:outline-none"
          />

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="mobile-search-clear flex h-5 w-5 items-center justify-center rounded-full transition"
              aria-label="Clear search"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {rightAction}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="mobile-search-suggestions absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border shadow-xl">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                handleChange(suggestion);
                onSearch?.(suggestion);
              }}
              className={cn(
                'mobile-search-suggestion w-full px-4 py-3 text-left text-sm font-medium transition',
                index < filteredSuggestions.length - 1 && 'border-b border-[color:var(--border)]'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Filter Chip component for filter UI
export function MobileFilterChip({
  label,
  active = false,
  count,
  onClick,
}: {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition',
        active
          ? 'border-transparent bg-primary text-white shadow-sm'
          : 'border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)]'
      )}
    >
      {label}
      {count !== undefined && <span className="text-[0.65rem] opacity-70">{count}</span>}
    </button>
  );
}
