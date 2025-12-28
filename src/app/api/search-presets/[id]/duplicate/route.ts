import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * Duplicate Preset
 * POST /api/search-presets/[id]/duplicate
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session?.user?.id) {
            return jsonError('Unauthorized', 401);
        }

        await assertResponderOrAbove();

        const { id } = await params;

        // Get the original preset
        const original = await prisma.searchPreset.findUnique({
            where: { id },
        });

        if (!original) {
            return jsonError('Preset not found', 404);
        }

        // Check access
        const userTeams = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                teamMemberships: {
                    select: {
                        teamId: true,
                    },
                },
            },
        });

        const userTeamIds = userTeams?.teamMemberships.map(t => t.teamId) || [];

        const hasAccess =
            original.createdById === session.user.id ||
            original.isPublic ||
            original.isShared ||
            original.sharedWithTeams.some(teamId => userTeamIds.includes(teamId));

        if (!hasAccess) {
            return jsonError('Access denied', 403);
        }

        // Get max order for user's presets
        const maxOrder = await prisma.searchPreset.aggregate({
            where: { createdById: session.user.id },
            _max: { order: true },
        });

        // Create duplicate
        const duplicated = await prisma.searchPreset.create({
            data: {
                name: `${original.name} (Copy)`,
                description: original.description,
                createdById: session.user.id,
                filterCriteria: original.filterCriteria as any,
                isShared: false,
                isPublic: false,
                icon: original.icon,
                color: original.color,
                order: (maxOrder._max.order || 0) + 1,
                sharedWithTeams: [],
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
        });

        logger.info('api.search_presets.duplicated', { presetId: duplicated.id, sourceId: original.id });
        return jsonOk({ preset: duplicated }, 200);
    } catch (error: any) {
        logger.error('api.search_presets.duplicate_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to duplicate preset', 500);
    }
}
