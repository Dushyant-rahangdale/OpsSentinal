'use client';

import { useRouter } from 'next/navigation';
import FilterChips from './FilterChips';

interface AnalyticsFiltersClientProps {
    teams: Array<{ id: string; name: string }>;
    services: Array<{ id: string; name: string }>;
    users: Array<{ id: string; name: string | null; email: string | null }>;
    currentFilters: {
        team?: string;
        service?: string;
        assignee?: string;
        status?: string;
        urgency?: string;
        window?: string;
    };
}

export default function AnalyticsFiltersClient({
    teams,
    services,
    users,
    currentFilters
}: AnalyticsFiltersClientProps) {
    const router = useRouter();

    const handleRemoveFilter = (filterType: string) => {
        const params = new URLSearchParams();
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (key !== filterType && value && value !== 'ALL') {
                params.append(key, value);
            }
        });
        router.push(`/analytics?${params.toString()}`);
    };

    const handleClearAll = () => {
        router.push('/analytics');
    };

    return (
        <FilterChips
            filters={currentFilters}
            teams={teams}
            services={services}
            users={users}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearAll}
        />
    );
}

