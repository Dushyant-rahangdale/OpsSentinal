'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

type ServicesFiltersProps = {
  currentSearch?: string;
  currentStatus?: string;
  currentTeam?: string;
  currentSort?: string;
  teams: Array<{ id: string; name: string }>;
};

export default function ServicesFilters({
  currentSearch = '',
  currentStatus = 'all',
  currentTeam = '',
  currentSort = 'name_asc',
  teams,
}: ServicesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === '' || value === 'name_asc') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    startTransition(() => {
      router.push(`/services?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchQuery.trim() });
  };

  const clearFilters = () => {
    setSearchQuery('');
    router.push('/services');
  };

  const hasActiveFilters =
    currentSearch || currentStatus !== 'all' || currentTeam || currentSort !== 'name_asc';

  return (
    <div
      style={{
        padding: '1.25rem',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid var(--border)',
        borderRadius: '0px',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        {/* Search */}
        <form onSubmit={handleSearch} style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search services by name or description..."
              style={{
                width: '100%',
                padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                border: '1px solid var(--border)',
                borderRadius: '0px',
                background: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary-color)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
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

        {/* Status Filter */}
        <div style={{ minWidth: '140px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: 'var(--text-secondary)',
            }}
          >
            Status
          </label>
          <select
            value={currentStatus}
            onChange={e => updateParams({ status: e.target.value })}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              border: '1px solid var(--border)',
              borderRadius: '0px',
              background: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="DEGRADED">Degraded</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        {/* Team Filter */}
        <div style={{ minWidth: '160px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: 'var(--text-secondary)',
            }}
          >
            Team
          </label>
          <select
            value={currentTeam}
            onChange={e => updateParams({ team: e.target.value })}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              border: '1px solid var(--border)',
              borderRadius: '0px',
              background: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div style={{ minWidth: '160px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: 'var(--text-secondary)',
            }}
          >
            Sort By
          </label>
          <select
            value={currentSort}
            onChange={e => updateParams({ sort: e.target.value })}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              border: '1px solid var(--border)',
              borderRadius: '0px',
              background: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="status">Status</option>
            <option value="incidents_desc">Most Incidents</option>
            <option value="incidents_asc">Least Incidents</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: '0.625rem 1rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '0px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--danger)';
              e.currentTarget.style.color = 'var(--danger)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Clear Filters
          </button>
        )}

        {isPending && (
          <span
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              padding: '0.625rem 0',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg
              style={{
                animation: 'spin 1s linear infinite',
                marginRight: '0.5rem',
                width: '14px',
                height: '14px',
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Loading...
          </span>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            Active filters:
          </span>
          {currentSearch && (
            <span
              style={{
                padding: '0.25rem 0.75rem',
                background: '#e0f2fe',
                color: '#0c4a6e',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: '500',
              }}
            >
              Search: "{currentSearch}"
            </span>
          )}
          {currentStatus !== 'all' && (
            <span
              style={{
                padding: '0.25rem 0.75rem',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: '500',
              }}
            >
              Status: {currentStatus}
            </span>
          )}
          {currentTeam && (
            <span
              style={{
                padding: '0.25rem 0.75rem',
                background: '#dbeafe',
                color: '#1e40af',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: '500',
              }}
            >
              Team: {teams.find(t => t.id === currentTeam)?.name || 'Unknown'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
