import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { getAccessiblePresets, type FilterCriteria } from '@/lib/search-presets';

/**
 * Get All Accessible Presets
 * GET /api/search-presets
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's teams (if any)
        const userTeams = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                teams: {
                    select: {
                        teamId: true,
                    },
                },
            },
        });

        const userTeamIds = userTeams?.teams.map(t => t.teamId) || [];

        const presets = await getAccessiblePresets(session.user.id, userTeamIds);

        return NextResponse.json({ presets });
    } catch (error: any) {
        console.error('Get search presets error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch search presets' },
            { status: 500 }
        );
    }
}

/**
 * Create Search Preset
 * POST /api/search-presets
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertResponderOrAbove();

        const body = await req.json();
        const {
            name,
            description,
            filterCriteria,
            isShared = false,
            isPublic = false,
            icon,
            color,
            sharedWithTeams = [],
        } = body;

        // Validation
        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Preset name is required' },
                { status: 400 }
            );
        }

        if (name.length > 100) {
            return NextResponse.json(
                { error: 'Preset name must be 100 characters or less' },
                { status: 400 }
            );
        }

        if (!filterCriteria || typeof filterCriteria !== 'object') {
            return NextResponse.json(
                { error: 'Filter criteria is required' },
                { status: 400 }
            );
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

        return NextResponse.json({ preset });
    } catch (error: any) {
        console.error('Create search preset error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create search preset' },
            { status: 500 }
        );
    }
}

