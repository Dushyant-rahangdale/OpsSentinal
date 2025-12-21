'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Input from './Input';

interface SearchInputProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  suggestions?: string[];
  recentSearches?: string[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
}

export default function SearchInput({
  label,
  value = '',
  onChange,
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  suggestions = [],
  recentSearches = [],
  error,
  helperText,
  fullWidth,
  className = '',
}: SearchInputProps) {
  const [searchValue, setSearchValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  useEffect(() => {
    if (searchValue && suggestions.length > 0) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchValue, suggestions]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onChange?.(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearch?.(newValue);
    }, debounceMs);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchValue(suggestion);
    onChange?.(suggestion);
    onSearch?.(suggestion);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setSearchValue('');
    onChange?.('');
    onSearch?.('');
    setShowSuggestions(false);
  };

  return (
    <div
      className={`ui-search-input ${fullWidth ? 'ui-search-input-full-width' : ''} ${className}`}
      style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}
    >
      <Input
        label={label}
        value={searchValue}
        onChange={handleChange}
        placeholder={placeholder}
        error={error}
        helperText={helperText}
        fullWidth={fullWidth}
        leftIcon={<span>🔍</span>}
        rightIcon={
          searchValue ? (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-muted)',
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null
        }
      />
      {showSuggestions && (filteredSuggestions.length > 0 || recentSearches.length > 0) && (
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
            overflowY: 'auto',
            animation: 'fadeIn var(--transition-base) var(--ease-out)',
          }}
        >
          {filteredSuggestions.length > 0 && (
            <>
              <div
                style={{
                  padding: 'var(--spacing-2) var(--spacing-4)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                Suggestions
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-neutral-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </>
          )}
          {recentSearches.length > 0 && (
            <>
              <div
                style={{
                  padding: 'var(--spacing-2) var(--spacing-4)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  borderTop: filteredSuggestions.length > 0 ? '1px solid var(--border)' : 'none',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                Recent Searches
              </div>
              {recentSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(search)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-neutral-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>🕐</span>
                  <span>{search}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

