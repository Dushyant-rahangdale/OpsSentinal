'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';

interface DropdownOption {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

export default function Dropdown({
  trigger,
  options,
  onSelect,
  position = 'bottom-left',
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const positionStyles = {
    'bottom-left': {
      top: '100%',
      left: 0,
      marginTop: '4px',
    },
    'bottom-right': {
      top: '100%',
      right: 0,
      marginTop: '4px',
    },
    'top-left': {
      bottom: '100%',
      left: 0,
      marginBottom: '4px',
    },
    'top-right': {
      bottom: '100%',
      right: 0,
      marginBottom: '4px',
    },
  };

  return (
    <div
      ref={dropdownRef}
      className={`ui-dropdown ${className}`}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className="ui-dropdown-menu"
          style={{
            position: 'absolute',
            ...positionStyles[position],
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '200px',
            zIndex: 'var(--z-dropdown)',
            overflow: 'hidden',
            animation: 'fadeIn var(--transition-fast) var(--ease-out)',
          }}
        >
          {options.map((option, index) => {
            if (option.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  style={{
                    height: '1px',
                    background: 'var(--border)',
                    margin: 'var(--spacing-1) 0',
                  }}
                />
              );
            }

            return (
              <button
                key={option.value}
                onClick={() => {
                  if (!option.disabled) {
                    onSelect(option.value);
                    setIsOpen(false);
                  }
                }}
                disabled={option.disabled}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  background: 'transparent',
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
                  if (!option.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {option.icon && <span>{option.icon}</span>}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


