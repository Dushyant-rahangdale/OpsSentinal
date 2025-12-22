'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import CreatePresetFromCurrent from '@/components/CreatePresetFromCurrent';

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
    currentCriteria
}: IncidentsFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(currentSearch);
    const [isPending, startTransition] = useTransition();

    const updateParams = (updates: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        // Reset to page 1 when filters change
        params.delete('page');
        Object.entries(updates).forEach(([key, value]) => {
            if (value === 'all' || value === '' || value === 'newest') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        startTransition(() => {
            router.push(`/incidents?${params.toString()}`);
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateParams({ search: searchQuery.trim() });
    };

    const criteria: FilterCriteria = currentCriteria || {
        filter: currentFilter,
        search: currentSearch,
        priority: currentPriority,
        urgency: currentUrgency,
        sort: currentSort,
    };

    return (
        <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1.5rem', 
            flexWrap: 'wrap', 
            alignItems: 'center',
            padding: '1rem',
            background: '#f9fafb',
            border: '1px solid var(--border)',
            borderRadius: '0px'
        }}>
            {/* Search */}
            <form onSubmit={handleSearch} style={{ flex: '1', minWidth: '200px', maxWidth: '400px' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search incidents..."
                        style={{
                            width: '100%',
                            padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            background: '#fff',
                            fontSize: '0.9rem',
                            outline: 'none'
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
                            alignItems: 'center'
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>
                </div>
            </form>

            {/* Priority Filter */}
            <select
                value={currentPriority}
                onChange={(e) => updateParams({ priority: e.target.value })}
                style={{
                    padding: '0.625rem 0.875rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0px',
                    background: '#fff',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minWidth: '120px'
                }}
            >
                <option value="all">All Priorities</option>
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
                <option value="P5">P5 - Info</option>
            </select>

            {/* Urgency Filter */}
            <select
                value={currentUrgency}
                onChange={(e) => updateParams({ urgency: e.target.value })}
                style={{
                    padding: '0.625rem 0.875rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0px',
                    background: '#fff',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minWidth: '120px'
                }}
            >
                <option value="all">All Urgencies</option>
                <option value="HIGH">High</option>
                <option value="LOW">Low</option>
            </select>

            {/* Sort */}
            <select
                value={currentSort}
                onChange={(e) => updateParams({ sort: e.target.value })}
                style={{
                    padding: '0.625rem 0.875rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0px',
                    background: '#fff',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minWidth: '140px'
                }}
            >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority (P1→P5)</option>
                <option value="status">Status</option>
                <option value="updated">Recently Updated</option>
            </select>

            {isPending && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</span>
            )}

            {/* Save as Preset Button */}
            <CreatePresetFromCurrent currentCriteria={criteria} />
        </div>
    );
}
