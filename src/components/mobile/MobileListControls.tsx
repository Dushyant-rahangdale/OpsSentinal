'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MobileSearch, { MobileFilterChip } from '@/components/mobile/MobileSearch';

type MobileListControlsProps = {
    basePath: string;
    filters: { label: string; value: string | null }[];
    sortOptions: { label: string; value: string }[];
    placeholder?: string;
};

export default function MobileListControls({
    basePath,
    filters,
    sortOptions,
    placeholder = 'Search...'
}: MobileListControlsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentQuery = searchParams.get('q') || '';
    const activeFilter = searchParams.get('filter') || 'all';
    const activeSort = searchParams.get('sort') || sortOptions[0]?.value || 'created_desc';

    const [term, setTerm] = useState(currentQuery);

    useEffect(() => {
        setTerm(currentQuery);
    }, [currentQuery]);

    const updateParams = (updates: { q?: string; filter?: string | null; sort?: string }) => {
        const params = new URLSearchParams(searchParams);

        if (updates.q !== undefined) {
            if (updates.q) params.set('q', updates.q);
            else params.delete('q');
        }

        if (updates.filter !== undefined) {
            if (updates.filter && updates.filter !== 'all') params.set('filter', updates.filter);
            else params.delete('filter');
        }

        if (updates.sort !== undefined) {
            if (updates.sort) params.set('sort', updates.sort);
            else params.delete('sort');
        }

        router.replace(`${basePath}?${params.toString()}`);
    };

    useEffect(() => {
        const handle = window.setTimeout(() => {
            if (term !== currentQuery) {
                updateParams({ q: term });
            }
        }, 400);

        return () => window.clearTimeout(handle);
    }, [term, currentQuery]);

    const handleFilterChange = (filterValue: string | null) => {
        updateParams({ filter: filterValue });
    };

    const handleSortChange = (sortValue: string) => {
        updateParams({ sort: sortValue });
    };

    return (
        <div className="mobile-list-controls">
            <MobileSearch
                placeholder={placeholder}
                value={term}
                onChange={setTerm}
            />

            <div className="mobile-filter-toolbar">
                <div className="mobile-filter-row">
                    {filters.map((filter) => (
                        <MobileFilterChip
                            key={filter.label}
                            label={filter.label}
                            active={activeFilter === (filter.value || 'all')}
                            onClick={() => handleFilterChange(filter.value)}
                        />
                    ))}
                </div>
                <div className="mobile-filter-row secondary">
                    <label className="mobile-filter-label" htmlFor="mobile-sort">
                        Sort
                    </label>
                    <select
                        id="mobile-sort"
                        className="mobile-filter-select"
                        value={activeSort}
                        onChange={(event) => handleSortChange(event.target.value)}
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
