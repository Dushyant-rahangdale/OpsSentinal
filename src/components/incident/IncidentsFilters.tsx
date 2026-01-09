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
    setSearchQuery(''); // Reset search input
    startTransition(() => {
      router.push('/incidents');
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    currentSearch !== '' ||
    currentPriority !== 'all' ||
    currentUrgency !== 'all' ||
    currentSort !== 'newest';

  const criteria: FilterCriteria = currentCriteria || {
    filter: currentFilter,
    search: currentSearch,
    priority: currentPriority,
    urgency: currentUrgency,
    sort: currentSort,
  };

  return (
    <div className="flex flex-wrap items-end gap-3 w-full">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 min-w-[240px] max-w-full lg:max-w-[500px]">
        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
          Search
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Title, description, or ID…"
            className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary transition-colors bg-transparent border-0"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
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
      <div className="w-full sm:w-auto min-w-[160px]">
        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
          Priority
        </label>
        <select
          value={currentPriority}
          onChange={e => updateParams({ priority: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
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
      <div className="w-full sm:w-auto min-w-[140px]">
        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
          Urgency
        </label>
        <select
          value={currentUrgency}
          onChange={e => updateParams({ urgency: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
        >
          <option value="all">All</option>
          <option value="HIGH">High</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Sort */}
      <div className="w-full sm:w-auto min-w-[170px]">
        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
          Sort
        </label>
        <select
          value={currentSort}
          onChange={e => updateParams({ sort: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority">Priority (P1→P5)</option>
          <option value="status">Status</option>
          <option value="updated">Recently Updated</option>
        </select>
      </div>

      <div className="flex gap-2 items-center mt-2 sm:mt-0 lg:ml-auto">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shadow-sm"
            aria-label="Clear all incident filters"
            disabled={isPending}
          >
            ✕ Clear All
          </button>
        )}

        {/* Save as Preset Button */}
        <CreatePresetFromCurrent currentCriteria={criteria} />

        {isPending && <span className="text-xs text-slate-400 animate-pulse">Loading…</span>}
      </div>
    </div>
  );
}
