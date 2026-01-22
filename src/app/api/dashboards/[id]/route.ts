import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Single Dashboard API - GET, PUT, DELETE operations
 */

// GET: Fetch single dashboard with widgets
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: {
        widgets: { orderBy: { createdAt: 'asc' } },
        user: { select: { name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Check access permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, teamMemberships: { select: { teamId: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isOwner = dashboard.userId === user.id;
    const isTeamMember =
      dashboard.teamId && user.teamMemberships.some(m => m.teamId === dashboard.teamId);
    const isPublicOrTemplate = dashboard.visibility === 'PUBLIC' || dashboard.isTemplate;

    if (!isOwner && !isTeamMember && !isPublicOrTemplate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      dashboard,
      permissions: {
        canEdit: isOwner,
        canDelete: isOwner,
        canShare: isOwner,
      },
    });
  } catch (error) {
    console.error('[Dashboard API] GET Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT: Update dashboard
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check ownership
    const existing = await prisma.dashboard.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied. You can only edit your own dashboards.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, layout, config, visibility, teamId, widgets } = body;

    // Transaction: Update dashboard and replace widgets
    const dashboard = await prisma.$transaction(async tx => {
      // Delete existing widgets if new widgets provided
      if (widgets && Array.isArray(widgets)) {
        await tx.dashboardWidget.deleteMany({ where: { dashboardId: id } });
      }

      // Update dashboard
      return tx.dashboard.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(layout !== undefined && { layout }),
          ...(config !== undefined && { config }),
          ...(visibility !== undefined && { visibility }),
          ...(teamId !== undefined && { teamId: visibility === 'TEAM' ? teamId : null }),
          ...(widgets &&
            Array.isArray(widgets) && {
              widgets: {
                create: widgets.map((w: any) => ({
                  widgetType: w.widgetType,
                  metricKey: w.metricKey,
                  title: w.title || null,
                  position: w.position || { x: 0, y: 0, w: 1, h: 1 },
                  config: w.config || {},
                })),
              },
            }),
        },
        include: { widgets: { orderBy: { createdAt: 'asc' } } },
      });
    });

    return NextResponse.json({ success: true, dashboard });
  } catch (error) {
    console.error('[Dashboard API] PUT Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete dashboard
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check ownership
    const existing = await prisma.dashboard.findUnique({
      where: { id },
      select: { userId: true, isTemplate: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    if (existing.isTemplate) {
      return NextResponse.json({ error: 'Cannot delete system templates' }, { status: 403 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own dashboards.' },
        { status: 403 }
      );
    }

    await prisma.dashboard.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Dashboard deleted' });
  } catch (error) {
    console.error('[Dashboard API] DELETE Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
