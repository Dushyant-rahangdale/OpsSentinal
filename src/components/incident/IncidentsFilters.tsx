'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import CreatePresetFromCurrent from '@/components/CreatePresetFromCurrent';
import type { FilterCriteria } from '@/lib/search-presets';

type IncidentsFiltersProps = {
  currentFilter: string;
  currentSort?: string;
  currentPriority?: string;
  currentUrgency?: string;
  currentSearch?: string;
  currentCriteria?: FilterCriteria;
};

export default function IncidentsFilters({
  currentFilter,
  currentSort = 'newest',
  currentPriority = 'all',
  currentUrgency = 'all',
  currentSearch = '',
  currentCriteria,
}: IncidentsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();

  const updateParams = (updates: Record<string, string>) => {
    const currentQuery = searchParams.toString();
    const params = new URLSearchParams(currentQuery);
    // Reset to page 1 when filters change
    params.delete('page');
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === '' || value === 'newest') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const nextQuery = params.toString();
    if (nextQuery === currentQuery) {
      return;
    }
    startTransition(() => {
      const nextUrl = nextQuery ? `/incidents?${nextQuery}` : '/incidents';
      router.push(nextUrl);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchQuery.trim() });
  };

  const clearFilters = () => {
    startTransition(() => {
      if (currentFilter && currentFilter !== 'all_open') {
        router.push(`/incidents?filter=${encodeURIComponent(currentFilter)}`);
      } else {
        router.push('/incidents');
      }
    });
  };

  const criteria: FilterCriteria = currentCriteria || {
    filter: currentFilter,
    search: currentSearch,
    priority: currentPriority,
    urgency: currentUrgency,
    sort: currentSort,
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
      }}
    >
      {/* Search */}
      <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '240px', maxWidth: '520px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.25rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
          }}
        >
          Search
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Title, description, or ID…"
            style={{
              width: '100%',
              padding: '0.55rem 2.4rem 0.55rem 0.85rem',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: '#fff',
              fontSize: '0.88rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>
      </form>

      {/* Priority Filter */}
      <div style={{ minWidth: 180 }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.25rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
          }}
        >
          Priority
        </label>
        <select
          value={currentPriority}
          onChange={e => updateParams({ priority: e.target.value })}
          style={{
            width: '100%',
            padding: '0.55rem 0.8rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: '#fff',
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">All</option>
          <option value="P1">P1 - Critical</option>
          <option value="P2">P2 - High</option>
          <option value="P3">P3 - Medium</option>
          <option value="P4">P4 - Low</option>
          <option value="P5">P5 - Info</option>
        </select>
      </div>

      {/* Urgency Filter */}
      <div style={{ minWidth: 160 }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.25rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
          }}
        >
          Urgency
        </label>
        <select
          value={currentUrgency}
          onChange={e => updateParams({ urgency: e.target.value })}
          style={{
            width: '100%',
            padding: '0.55rem 0.8rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: '#fff',
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">All</option>
          <option value="HIGH">High</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Sort */}
      <div style={{ minWidth: 190 }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.25rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
          }}
        >
          Sort
        </label>
        <select
          value={currentSort}
          onChange={e => updateParams({ sort: e.target.value })}
          style={{
            width: '100%',
            padding: '0.55rem 0.8rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: '#fff',
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority">Priority (P1→P5)</option>
          <option value="status">Status</option>
          <option value="updated">Recently Updated</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={clearFilters}
          className="glass-button"
          style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem' }}
          aria-label="Clear incident filters"
          disabled={isPending}
        >
          Clear
        </button>

        {/* Save as Preset Button */}
        <CreatePresetFromCurrent currentCriteria={criteria} />

        {isPending && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading…</span>
        )}
      </div>
    </div>
  );
}
