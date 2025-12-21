'use client';

import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { actualTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`ui-theme-toggle ${className}`}
      aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        padding: 'var(--spacing-2) var(--spacing-3)',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-primary)',
        transition: 'all var(--transition-base) var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-neutral-100)';
        e.currentTarget.style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>
        {actualTheme === 'light' ? '🌙' : '☀️'}
      </span>
      {showLabel && (
        <span>{actualTheme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
      )}
    </button>
  );
}


