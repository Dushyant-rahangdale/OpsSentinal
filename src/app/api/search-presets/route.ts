import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { assertResponderOrAbove, getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { getAccessiblePresets, type FilterCriteria } from '@/lib/search-presets';
import { jsonError, jsonOk } from '@/lib/api-response';
import { SearchPresetCreateSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

/**
 * Get All Accessible Presets
 * GET /api/search-presets
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session?.user?.id) {
            return jsonError('Unauthorized', 401);
        }

        // Get user's teams (if any)
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

        const presets = await getAccessiblePresets(session.user.id, userTeamIds);

        return jsonOk({ presets }, 200);
    } catch (error: any) {
        logger.error('api.search_presets.fetch_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to fetch search presets', 500);
    }
}

/**
 * Create Search Preset
 * POST /api/search-presets
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session?.user?.id) {
            return jsonError('Unauthorized', 401);
        }

        await assertResponderOrAbove();

        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return jsonError('Invalid JSON in request body.', 400);
        }
        const parsed = SearchPresetCreateSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
        }
        const {
            name,
            description,
            filterCriteria,
            isShared = false,
            isPublic = false,
            icon,
            color,
            sharedWithTeams = [],
        } = parsed.data;

        const permissions = await getUserPermissions();
        if (isPublic && !permissions.isAdmin) {
            return jsonError('Access denied', 403);
        }

        // Get max order for user's presets
        const maxOrder = await prisma.searchPreset.aggregate({
            where: { createdById: session.user.id },
            _max: { order: true },
        });

        const preset = await prisma.searchPreset.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                createdById: session.user.id,
                filterCriteria: filterCriteria as FilterCriteria,
                isShared: isShared || false,
                isPublic: isPublic || false,
                icon: icon || null,
                color: color || null,
                order: (maxOrder._max.order || 0) + 1,
                sharedWithTeams: Array.isArray(sharedWithTeams) ? sharedWithTeams : [],
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

        logger.info('api.search_presets.created', { presetId: preset.id });
        return jsonOk({ preset }, 200);
    } catch (error: any) {
        logger.error('api.search_presets.create_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to create search preset', 500);
    }
}
