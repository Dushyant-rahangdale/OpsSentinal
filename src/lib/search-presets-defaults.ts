/**
 * Default Search Presets
 * Creates default presets for new users
 */

import prisma from './prisma';
import { logger } from '@/lib/logger';
import { type FilterCriteria } from './search-presets';

export const DEFAULT_PRESETS: Array<{
  name: string;
  description: string;
  filterCriteria: FilterCriteria;
  icon: string;
  color: string;
  isDefault: boolean;
}> = [
  {
    name: 'My Open Incidents',
    description: 'All unresolved incidents assigned to me',
    filterCriteria: {
      filter: 'mine',
      priority: 'all',
      urgency: 'all',
      sort: 'newest',
    },
    icon: '👤',
    color: '#1976d2',
    isDefault: true,
  },
  {
    name: 'Critical Incidents',
    description: 'All open incidents with P1 priority',
    filterCriteria: {
      filter: 'all_open',
      priority: 'P1',
      urgency: 'all',
      sort: 'priority',
    },
    icon: '🔥',
    color: '#d32f2f',
    isDefault: true,
  },
  {
    name: 'Recently Resolved',
    description: 'Incidents resolved in the last 7 days',
    filterCriteria: {
      filter: 'resolved',
      priority: 'all',
      urgency: 'all',
      sort: 'updated',
    },
    icon: '✓',
    color: '#388e3c',
    isDefault: true,
  },
  {
    name: 'High Urgency Open',
    description: 'All open high urgency incidents',
    filterCriteria: {
      filter: 'all_open',
      priority: 'all',
      urgency: 'HIGH',
      sort: 'newest',
    },
    icon: '⚠️',
    color: '#f57c00',
    isDefault: true,
  },
];

/**
 * Create default presets for a user
 */
export async function createDefaultPresetsForUser(userId: string): Promise<void> {
  // Check if SearchPreset model exists
  if (!prisma.searchPreset) {
    logger.warn(
      'SearchPreset model not available. Run "npx prisma generate" to regenerate Prisma client.'
    );
    return;
  }

  // Check if user already has presets
  const existingPresets = await prisma.searchPreset.count({
    where: { createdById: userId },
  });

  if (existingPresets > 0) {
    return; // User already has presets
  }

  // Create default presets
  await prisma.searchPreset.createMany({
    data: DEFAULT_PRESETS.map((preset, index) => ({
      name: preset.name,
      description: preset.description,
      createdById: userId,
      filterCriteria: preset.filterCriteria,
      icon: preset.icon,
      color: preset.color,
      isDefault: preset.isDefault,
      isShared: false,
      isPublic: false,
      order: index,
    })),
  });
}
