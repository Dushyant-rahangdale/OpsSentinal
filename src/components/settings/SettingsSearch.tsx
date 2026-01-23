'use client';

import { useEffect, useMemo, useRef, useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import type { SettingsNavItem } from '@/components/settings/navConfig';

type Props = {
  items: SettingsNavItem[];
  placeholder?: string;
  variant?: 'default' | 'drawer';
  enableHotkey?: boolean;
};

export default function SettingsSearch({
  items,
  placeholder = 'Search settings',
  variant = 'default',
  enableHotkey = true,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const listboxId = `settings-search-${id}`;

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return items.filter(item => {
      const haystack = [item.label, item.description, ...(item.keywords || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [items, query]);
  const displayResults = useMemo(() => results.slice(0, 8), [results]);

  useEffect(() => {
    if (!enableHotkey) return;

    const handleHotkey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleHotkey);
    return () => document.removeEventListener('keydown', handleHotkey);
  }, [enableHotkey]);

  useEffect(() => {
    setActiveIndex(displayResults.length > 0 ? 0 : -1); // eslint-disable-line react-hooks/set-state-in-effect
  }, [displayResults.length, query]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!displayResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(prev => (prev + 1) % displayResults.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? displayResults.length - 1 : prev - 1));
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      router.push(displayResults[activeIndex].href); // eslint-disable-line security/detect-object-injection
      setQuery('');
    }

    if (event.key === 'Escape') {
      setQuery('');
    }
  };

  return (
    <div className={`settings-search ${variant}`}>
      <div className="settings-search-input">
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-expanded={query.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          role="combobox"
          ref={inputRef}
        />
        {enableHotkey && <span aria-hidden="true">Ctrl+K</span>}
      </div>
      {query && (
        <div className="settings-search-results" role="listbox" id={listboxId}>
          {displayResults.length === 0 ? (
            <div className="settings-search-empty">
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              No matches. Try searching for &quot;security&quot; or &quot;notifications&quot;.
            </div>
           
           
           
           
          ) : (
            displayResults.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`settings-search-item ${activeIndex === index ? 'is-active' : ''}`}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                onClick={() => router.push(item.href)}
              >
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </div>
                <span>Enter</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
