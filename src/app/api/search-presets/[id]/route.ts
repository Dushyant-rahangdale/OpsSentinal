import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { trackPresetUsage, type FilterCriteria } from '@/lib/search-presets';
import { jsonError, jsonOk } from '@/lib/api-response';
import { SearchPresetPatchSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

/**
 * Get Preset by ID
 * GET /api/search-presets/[id]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return jsonError('Unauthorized', 401);
        }

        const { id } = await params;

        const preset = await prisma.searchPreset.findUnique({
            where: { id },
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

        if (!preset) {
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
            preset.createdById === session.user.id ||
            preset.isPublic ||
            preset.isShared ||
            preset.sharedWithTeams.some(teamId => userTeamIds.includes(teamId));

        if (!hasAccess) {
            return jsonError('Access denied', 403);
        }

        return jsonOk({ preset }, 200);
    } catch (error: any) {
        logger.error('api.search_presets.fetch_one_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to fetch preset', 500);
    }
}

/**
 * Update Preset
 * PATCH /api/search-presets/[id]
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return jsonError('Unauthorized', 401);
        }

        const { id } = await params;

        // Check ownership or admin
        const preset = await prisma.searchPreset.findUnique({
            where: { id },
        });

        if (!preset) {
            return jsonError('Preset not found', 404);
        }

        const permissions = await import('@/lib/rbac').then(m => m.getUserPermissions());
        if (preset.createdById !== session.user.id && !permissions.isAdmin) {
            return jsonError('Access denied', 403);
        }

        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return jsonError('Invalid JSON in request body.', 400);
        }
        const parsed = SearchPresetPatchSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
        }
        const {
            name,
            description,
            filterCriteria,
            isShared,
            isPublic,
            icon,
            color,
            order,
            sharedWithTeams,
        } = parsed.data;

        const updateData: any = {};

        if (name !== undefined) {
            updateData.name = name.trim();
        }

        if (description !== undefined) {
            updateData.description = description?.trim() || null;
        }

        if (filterCriteria !== undefined) {
            updateData.filterCriteria = filterCriteria;
        }

        if (isShared !== undefined) {
            updateData.isShared = isShared;
        }

        if (isPublic !== undefined && permissions.isAdmin) {
            updateData.isPublic = isPublic;
        }

        if (icon !== undefined) {
            updateData.icon = icon || null;
        }

        if (color !== undefined) {
            updateData.color = color || null;
        }

        if (order !== undefined) {
            updateData.order = order;
        }

        if (sharedWithTeams !== undefined) {
            updateData.sharedWithTeams = Array.isArray(sharedWithTeams) ? sharedWithTeams : [];
        }

        const updated = await prisma.searchPreset.update({
            where: { id },
            data: updateData,
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

        logger.info('api.search_presets.updated', { presetId: updated.id });
        return jsonOk({ preset: updated }, 200);
    } catch (error: any) {
        logger.error('api.search_presets.update_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to update preset', 500);
    }
}

/**
 * Delete Preset
 * DELETE /api/search-presets/[id]
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return jsonError('Unauthorized', 401);
        }

        const { id } = await params;

        const preset = await prisma.searchPreset.findUnique({
            where: { id },
        });

        if (!preset) {
            return jsonError('Preset not found', 404);
        }

        const permissions = await import('@/lib/rbac').then(m => m.getUserPermissions());
        if (preset.createdById !== session.user.id && !permissions.isAdmin) {
            return jsonError('Access denied', 403);
        }

        await prisma.searchPreset.delete({
            where: { id },
        });

        logger.info('api.search_presets.deleted', { presetId: id });
        return jsonOk({ success: true }, 200);
    } catch (error: any) {
        logger.error('api.search_presets.delete_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to delete preset', 500);
    }
}
