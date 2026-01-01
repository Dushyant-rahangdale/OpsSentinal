'use client';

import { useState, useRef, ReactNode } from 'react';

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
    const showSuggestions = isFocused && suggestions.length > 0 && value.length > 0;

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
        <div style={{ position: 'relative' }}>
            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: isFocused ? 'var(--bg-surface)' : 'var(--bg-secondary)',
                        border: isFocused ? '2px solid var(--primary)' : '2px solid transparent',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {leftIcon || (
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--text-muted)"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                    )}

                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        placeholder={placeholder}
                        autoFocus={autoFocus}
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.95rem',
                            color: 'var(--text-primary)',
                        }}
                    />

                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '20px',
                                height: '20px',
                                background: 'var(--text-muted)',
                                border: 'none',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}

                    {rightAction}
                </div>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.5rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        zIndex: 100,
                    }}
                >
                    {suggestions.filter(s =>
                        s.toLowerCase().includes(value.toLowerCase())
                    ).slice(0, 5).map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                handleChange(suggestion);
                                onSearch?.(suggestion);
                            }}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: index < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                                textAlign: 'left',
                                fontSize: '0.9rem',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                            }}
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
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                background: active ? 'var(--accent)' : 'var(--bg-secondary)',
                color: active ? 'white' : 'var(--text-secondary)',
                border: active ? 'none' : '1px solid var(--border)',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}
        >
            {label}
            {count !== undefined && (
                <span style={{
                    opacity: 0.8,
                    fontSize: '0.7rem',
                }}>
                    {count}
                </span>
            )}
        </button>
    );
}
