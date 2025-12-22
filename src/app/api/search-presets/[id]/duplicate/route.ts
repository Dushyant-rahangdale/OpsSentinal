import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';
import prisma from '@/lib/prisma';

/**
 * Duplicate Preset
 * POST /api/search-presets/[id]/duplicate
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertResponderOrAbove();

        const { id } = await params;

        // Get the original preset
        const original = await prisma.searchPreset.findUnique({
            where: { id },
        });

        if (!original) {
            return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
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
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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

        return NextResponse.json({ preset: duplicated });
    } catch (error: any) {
        console.error('Duplicate preset error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to duplicate preset' },
            { status: 500 }
        );
    }
}

