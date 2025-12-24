import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { trackPresetUsage } from '@/lib/search-presets';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * Track Preset Usage
 * POST /api/search-presets/[id]/use
 */
export async function POST(
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

        await trackPresetUsage(id, session.user.id);

        return jsonOk({ success: true }, 200);
    } catch (error: any) {
        logger.error('api.search_presets.track_usage_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to track preset usage', 500);
    }
}







