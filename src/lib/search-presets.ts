/**
 * Search Presets Library
 * Utilities for working with search presets and filter criteria
 */

import prisma from './prisma';
import { getUserPermissions } from './rbac';

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
 * Build Prisma where clause from filter criteria
 */
export function buildWhereFromCriteria(
    criteria: FilterCriteria,
    currentUserId?: string
): any {
    const where: any = {};

    // Status filter
    if (criteria.statuses && criteria.statuses.length > 0) {
        where.status = { in: criteria.statuses };
    } else if (criteria.filter === 'mine') {
        where.assigneeId = currentUserId;
        where.status = { notIn: ['RESOLVED'] };
    } else if (criteria.filter === 'all_open') {
        where.status = { notIn: ['RESOLVED', 'SNOOZED', 'SUPPRESSED'] };
    } else if (criteria.filter === 'resolved') {
        where.status = 'RESOLVED';
    } else if (criteria.filter === 'snoozed') {
        where.status = 'SNOOZED';
    } else if (criteria.filter === 'suppressed') {
        where.status = 'SUPPRESSED';
    }

    // Search filter
    if (criteria.search) {
        where.OR = [
            { title: { contains: criteria.search, mode: 'insensitive' as const } },
            { description: { contains: criteria.search, mode: 'insensitive' as const } },
            { id: { contains: criteria.search, mode: 'insensitive' as const } }
        ];
    }

    // Priority filter
    if (criteria.priority && criteria.priority !== 'all') {
        where.priority = criteria.priority;
    }

    // Urgency filter
    if (criteria.urgency && criteria.urgency !== 'all') {
        where.urgency = criteria.urgency;
    }

    // Service filter
    if (criteria.serviceIds && criteria.serviceIds.length > 0) {
        where.serviceId = { in: criteria.serviceIds };
    }

    // Assignee filter
    if (criteria.assigneeIds && criteria.assigneeIds.length > 0) {
        where.assigneeId = { in: criteria.assigneeIds };
    }

    // Date range filter
    if (criteria.dateRange) {
        const field = criteria.dateRange.field;
        where[field] = {
            gte: new Date(criteria.dateRange.from),
            lte: new Date(criteria.dateRange.to),
        };
    }

    // Tags filter
    if (criteria.tags && criteria.tags.length > 0) {
        where.tags = {
            some: {
                tag: {
                    id: { in: criteria.tags }
                }
            }
        };
    }

    // Custom fields filter
    if (criteria.customFields && Object.keys(criteria.customFields).length > 0) {
        where.customFieldValues = {
            some: {
                customField: {
                    key: { in: Object.keys(criteria.customFields) }
                },
                value: {
                    in: Object.values(criteria.customFields)
                }
            }
        };
    }

    return where;
}

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

/**
 * Get all accessible presets for a user
 */
export async function getAccessiblePresets(userId: string, userTeamIds: string[] = []): Promise<SearchPresetWithCreator[]> {
    // Check if SearchPreset model exists in Prisma client (defensive check)
    if (!prisma.searchPreset) {
        console.warn('SearchPreset model not available. Run "npx prisma generate" to regenerate Prisma client.');
        return [];
    }

    const presets = await prisma.searchPreset.findMany({
        where: {
            OR: [
                { createdById: userId }, // User's own presets
                { isPublic: true }, // Public presets
                { isShared: true }, // Shared presets
                { sharedWithTeams: { hasSome: userTeamIds } }, // Presets shared with user's teams
            ],
        },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: [
            { order: 'asc' },
            { usageCount: 'desc' },
            { lastUsedAt: 'desc' },
            { createdAt: 'desc' },
        ],
    });

    return presets as SearchPresetWithCreator[];
}

/**
 * Track preset usage
 */
export async function trackPresetUsage(presetId: string, userId: string): Promise<void> {
    // Check if models exist
    if (!prisma.searchPreset || !prisma.searchPresetUsage) {
        console.warn('SearchPreset models not available. Run "npx prisma generate" to regenerate Prisma client.');
        return;
    }

    await prisma.$transaction([
        prisma.searchPresetUsage.create({
            data: {
                presetId,
                userId,
            },
        }),
        prisma.searchPreset.update({
            where: { id: presetId },
            data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date(),
            },
        }),
    ]);
}

/**
 * Get popular presets (most used)
 */
export async function getPopularPresets(limit: number = 10): Promise<SearchPresetWithCreator[]> {
    // Check if SearchPreset model exists
    if (!prisma.searchPreset) {
        console.warn('SearchPreset model not available. Run "npx prisma generate" to regenerate Prisma client.');
        return [];
    }

    const presets = await prisma.searchPreset.findMany({
        where: {
            OR: [
                { isPublic: true },
                { isShared: true },
            ],
        },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            usageCount: 'desc',
        },
        take: limit,
    });

    return presets as SearchPresetWithCreator[];
}

