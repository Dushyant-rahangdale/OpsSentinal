/**
 * Search Presets Utilities
 * Client-safe utilities for working with search presets and filter criteria
 */

export type FilterCriteria = {
    filter?: string; // 'all_open', 'mine', 'resolved', 'snoozed', 'suppressed'
    search?: string;
    priority?: string; // 'all', 'P1', 'P2', 'P3', 'P4', 'P5'
    urgency?: string; // 'all', 'HIGH', 'LOW'
    sort?: string; // 'newest', 'oldest', 'updated', 'status', 'priority'
    serviceIds?: string[]; // Filter by specific services
    assigneeIds?: string[]; // Filter by specific assignees
    statuses?: string[]; // Filter by specific statuses
    dateRange?: {
        field: 'createdAt' | 'updatedAt' | 'resolvedAt';
        from: string; // ISO date string
        to: string; // ISO date string
    };
    tags?: string[]; // Filter by tags
    customFields?: Record<string, string>; // Custom field filters { fieldKey: value }
};

export type SearchPresetWithCreator = {
    id: string;
    name: string;
    description: string | null;
    createdById: string;
    isShared: boolean;
    isDefault: boolean;
    isPublic: boolean;
    filterCriteria: FilterCriteria;
    icon: string | null;
    color: string | null;
    order: number;
    usageCount: number;
    lastUsedAt: Date | null;
    sharedWithTeams: string[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: {
        id: string;
        name: string;
        email: string;
    };
};

/**
 * Build sort order from criteria
 */
export function buildOrderByFromCriteria(criteria: FilterCriteria): any {
    const sort = criteria.sort || 'newest';

    switch (sort) {
        case 'oldest':
            return { createdAt: 'asc' };
        case 'updated':
            return { updatedAt: 'desc' };
        case 'status':
            return { status: 'asc' };
        case 'priority':
            return { priority: 'asc' };
        case 'newest':
        default:
            return { createdAt: 'desc' };
    }
}

/**
 * Convert URL search params to filter criteria
 */
export function searchParamsToCriteria(searchParams: Record<string, string | string[] | undefined>): FilterCriteria {
    return {
        filter: typeof searchParams.filter === 'string' ? searchParams.filter : undefined,
        search: typeof searchParams.search === 'string' ? searchParams.search : undefined,
        priority: typeof searchParams.priority === 'string' ? searchParams.priority : undefined,
        urgency: typeof searchParams.urgency === 'string' ? searchParams.urgency : undefined,
        sort: typeof searchParams.sort === 'string' ? searchParams.sort : undefined,
        serviceIds: Array.isArray(searchParams.serviceIds)
            ? searchParams.serviceIds
            : typeof searchParams.serviceIds === 'string'
                ? [searchParams.serviceIds]
                : undefined,
        assigneeIds: Array.isArray(searchParams.assigneeIds)
            ? searchParams.assigneeIds
            : typeof searchParams.assigneeIds === 'string'
                ? [searchParams.assigneeIds]
                : undefined,
        statuses: Array.isArray(searchParams.statuses)
            ? searchParams.statuses
            : typeof searchParams.statuses === 'string'
                ? [searchParams.statuses]
                : undefined,
    };
}

/**
 * Convert filter criteria to URL search params
 */
export function criteriaToSearchParams(criteria: FilterCriteria): Record<string, string> {
    const params: Record<string, string> = {};

    if (criteria.filter) params.filter = criteria.filter;
    if (criteria.search) params.search = criteria.search;
    if (criteria.priority) params.priority = criteria.priority;
    if (criteria.urgency) params.urgency = criteria.urgency;
    if (criteria.sort) params.sort = criteria.sort;
    if (criteria.serviceIds?.length) params.serviceIds = criteria.serviceIds.join(',');
    if (criteria.assigneeIds?.length) params.assigneeIds = criteria.assigneeIds.join(',');
    if (criteria.statuses?.length) params.statuses = criteria.statuses.join(',');

    return params;
}
