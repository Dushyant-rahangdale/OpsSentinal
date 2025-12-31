'use client';

import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type SavedFilter = {
  id: string;
  name: string;
  filters: {
    status?: string;
    service?: string;
    assignee?: string;
    urgency?: string;
    range?: string;
  };
};

export default function DashboardSavedFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('dashboard-saved-filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved)); // eslint-disable-line react-hooks/set-state-in-effect
      } catch (e) {
        if (e instanceof Error) {
          logger.error('Failed to load saved filters', { error: e.message });
        } else {
          logger.error('Failed to load saved filters', { error: String(e) });
        }
      }
    }
  }, []);

  const saveCurrentFilter = () => {
    const currentFilters: SavedFilter['filters'] = {};
    const status = searchParams.get('status');
    const service = searchParams.get('service');
    const assignee = searchParams.get('assignee');
    const urgency = searchParams.get('urgency');
    const range = searchParams.get('range');

    if (status) currentFilters.status = status;
    if (service) currentFilters.service = service;
    if (assignee !== null) currentFilters.assignee = assignee;
    if (urgency) currentFilters.urgency = urgency;
    if (range) currentFilters.range = range;

    if (Object.keys(currentFilters).length === 0) {
      alert('No active filters to save');
      return;
    }

    if (!filterName.trim()) {
      setShowSaveDialog(true);
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: currentFilters
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('dashboard-saved-filters', JSON.stringify(updated));
    setFilterName('');
    setShowSaveDialog(false);
  };

  const loadFilter = (filter: SavedFilter) => {
    const params = new URLSearchParams();
    if (filter.filters.status) params.set('status', filter.filters.status);
    if (filter.filters.service) params.set('service', filter.filters.service);
    if (filter.filters.assignee !== undefined) params.set('assignee', filter.filters.assignee);
    if (filter.filters.urgency) params.set('urgency', filter.filters.urgency);
    if (filter.filters.range) params.set('range', filter.filters.range);
    router.push(`${pathname}?${params.toString()}`);
  };

  const deleteFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('dashboard-saved-filters', JSON.stringify(updated));
  };

  const hasActiveFilters = searchParams.toString().length > 0;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Saved Filters:</span>
        {savedFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => loadFilter(filter)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              border: '1px solid var(--border)',
              background: 'white',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <span>💾</span>
            {filter.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${filter.name}"?`)) {
                  deleteFilter(filter.id);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                padding: 0,
                marginLeft: '0.25rem',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Delete filter"
            >
              ×
            </button>
          </button>
        ))}
        {hasActiveFilters && (
          <button
            onClick={saveCurrentFilter}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              border: '1px solid var(--primary)',
              background: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>💾</span>
            Save Current
          </button>
        )}
      </div>

      {showSaveDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Save Filter Preset</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name (e.g., My Open Incidents)"
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                marginBottom: '1rem'
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filterName.trim()) {
                  saveCurrentFilter();
                }
                if (e.key === 'Escape') {
                  setShowSaveDialog(false);
                }
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setFilterName('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentFilter}
                disabled={!filterName.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: filterName.trim() ? 'var(--primary)' : '#ccc',
                  color: 'white',
                  cursor: filterName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

