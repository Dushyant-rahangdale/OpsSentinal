import prisma from './prisma';
import { logger } from '@/lib/logger';
import {
  type FilterCriteria,
  type SearchPresetWithCreator,
  buildOrderByFromCriteria,
  searchParamsToCriteria,
  criteriaToSearchParams,
} from './search-presets-utils';

export type { FilterCriteria, SearchPresetWithCreator };
export { buildOrderByFromCriteria, searchParamsToCriteria, criteriaToSearchParams };

/**
 * Build Prisma where clause from filter criteria
 */
export function buildWhereFromCriteria(criteria: FilterCriteria, currentUserId?: string): any {
   
  const where: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

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
      { id: { contains: criteria.search, mode: 'insensitive' as const } },
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
          id: { in: criteria.tags },
        },
      },
    };
  }

  // Custom fields filter
  if (criteria.customFields && Object.keys(criteria.customFields).length > 0) {
    where.customFieldValues = {
      some: {
        customField: {
          key: { in: Object.keys(criteria.customFields) },
        },
        value: {
          in: Object.values(criteria.customFields),
        },
      },
    };
  }

  return where;
}

/**
 * Get all accessible presets for a user
 */
export async function getAccessiblePresets(
  userId: string,
  userTeamIds: string[] = []
): Promise<SearchPresetWithCreator[]> {
  // Check if SearchPreset model exists in Prisma client (defensive check)
  if (!prisma.searchPreset) {
    logger.warn('SearchPreset model not available. Run "npx prisma generate" to regenerate Prisma client.');
    return [];
  }

  try {
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
  } catch (error: any) {
     
    // Handle case where table doesn't exist yet (migration not applied)
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      logger.warn('SearchPreset table does not exist. Please run "npx prisma db push" or apply migrations.');
      return [];
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Track preset usage
 */
export async function trackPresetUsage(presetId: string, userId: string): Promise<void> {
  // Check if models exist
  if (!prisma.searchPreset || !prisma.searchPresetUsage) {
    logger.warn('SearchPreset models not available. Run "npx prisma generate" to regenerate Prisma client.');
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
    logger.warn('SearchPreset model not available. Run "npx prisma generate" to regenerate Prisma client.');
    return [];
  }

  const presets = await prisma.searchPreset.findMany({
    where: {
      OR: [{ isPublic: true }, { isShared: true }],
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
