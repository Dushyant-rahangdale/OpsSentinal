import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { trackPresetUsage, type FilterCriteria } from '@/lib/search-presets';

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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            preset.createdById === session.user.id ||
            preset.isPublic ||
            preset.isShared ||
            preset.sharedWithTeams.some(teamId => userTeamIds.includes(teamId));

        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ preset });
    } catch (error: any) {
        console.error('Get preset error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch preset' },
            { status: 500 }
        );
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check ownership or admin
        const preset = await prisma.searchPreset.findUnique({
            where: { id },
        });

        if (!preset) {
            return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
        }

        const permissions = await import('@/lib/rbac').then(m => m.getUserPermissions());
        if (preset.createdById !== session.user.id && !permissions.isAdmin) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const body = await req.json();
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
        } = body;

        const updateData: any = {};

        if (name !== undefined) {
            if (name.trim().length === 0) {
                return NextResponse.json(
                    { error: 'Preset name cannot be empty' },
                    { status: 400 }
                );
            }
            if (name.length > 100) {
                return NextResponse.json(
                    { error: 'Preset name must be 100 characters or less' },
                    { status: 400 }
                );
            }
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

        return NextResponse.json({ preset: updated });
    } catch (error: any) {
        console.error('Update preset error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update preset' },
            { status: 500 }
        );
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const preset = await prisma.searchPreset.findUnique({
            where: { id },
        });

        if (!preset) {
            return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
        }

        const permissions = await import('@/lib/rbac').then(m => m.getUserPermissions());
        if (preset.createdById !== session.user.id && !permissions.isAdmin) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        await prisma.searchPreset.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete preset error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete preset' },
            { status: 500 }
        );
    }
}

