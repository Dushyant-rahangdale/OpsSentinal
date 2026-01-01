'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import MobileSearch, { MobileFilterChip } from './MobileSearch';

import { useRef, useState, useEffect } from 'react';


// Helper to debounce manually if package not available
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout>(null);
    return (...args: Parameters<T>) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => callback(...args), delay);
    };
}

export function MobileSearchWithParams({
    placeholder = 'Search...',
    basePath
}: {
    placeholder?: string;
    basePath?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentQuery = searchParams.get('q') || '';
    const [term, setTerm] = useState(currentQuery);

    useEffect(() => {
        setTerm(currentQuery);
    }, [currentQuery]);

    const handleSearch = useDebounce((searchTerm: string) => {
        const params = new URLSearchParams(searchParams);
        if (searchTerm) {
            params.set('q', searchTerm);
        } else {
            params.delete('q');
        }
        const path = basePath || window.location.pathname;
        const newUrl = `${path}?${params.toString()}`;
        // console.log('Replacing URL:', newUrl); 
        router.replace(newUrl);
    }, 500);

    return (
        <MobileSearch
            placeholder={placeholder}
            value={term}
            onChange={(val) => {
                setTerm(val);
                handleSearch(val);
            }}
        />
    );
}

export function MobileFilterWithParams({
    filters
}: {
    filters: { label: string; value: string | null }[]
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeFilter = searchParams.get('filter') || 'all';

    const handleFilter = (filterValue: string | null) => {
        const params = new URLSearchParams(searchParams);
        if (filterValue && filterValue !== 'all') {
            params.set('filter', filterValue);
        } else {
            params.delete('filter');
        }
        router.replace(`${window.location.pathname}?${params.toString()}`);
    };

    return (
        <div style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'none',
        }}>
            {filters.map((filter) => (
                <MobileFilterChip
                    key={filter.label}
                    label={filter.label}
                    active={activeFilter === (filter.value || 'all')}
                    onClick={() => handleFilter(filter.value)}
                />
            ))}
        </div>
    );
}
