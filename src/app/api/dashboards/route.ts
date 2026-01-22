import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Dashboard API - List and Create Dashboards
 *
 * GET: List user's dashboards and available templates
 * POST: Create a new dashboard (optionally from template)
 */

// GET: List dashboards
export async function GET() {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, teamMemberships: { select: { teamId: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamIds = user.teamMemberships.map(m => m.teamId);

    // Fetch user's own dashboards, team dashboards, and templates
    const [userDashboards, teamDashboards, publicDashboards] = await Promise.all([
      // User's private dashboards
      prisma.dashboard.findMany({
        where: { userId: user.id, isTemplate: false },
        include: { widgets: { orderBy: { createdAt: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
      }),
      // Team shared dashboards
      prisma.dashboard.findMany({
        where: {
          visibility: 'TEAM',
          teamId: { in: teamIds },
          isTemplate: false,
        },
        include: { widgets: { orderBy: { createdAt: 'asc' } }, user: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      // Public templates and dashboards
      prisma.dashboard.findMany({
        where: {
          OR: [{ isTemplate: true }, { visibility: 'PUBLIC' }],
        },
        include: { widgets: { orderBy: { createdAt: 'asc' } }, user: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Separate templates from public dashboards
    const templates = publicDashboards.filter(d => d.isTemplate);
    const publicShared = publicDashboards.filter(d => !d.isTemplate && d.visibility === 'PUBLIC');

    return NextResponse.json({
      success: true,
      dashboards: userDashboards,
      teamDashboards,
      publicDashboards: publicShared,
      templates,
    });
  } catch (error) {
    console.error('[Dashboards API] GET Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboards',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: Create dashboard
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { name, description, templateId, visibility = 'PRIVATE', teamId, widgets = [] } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // If creating from template, clone the template's widgets
    let widgetsToCreate = widgets;
    if (templateId) {
      const template = await prisma.dashboard.findUnique({
        where: { id: templateId },
        include: { widgets: true },
      });
      if (template) {
        widgetsToCreate = template.widgets.map(w => ({
          widgetType: w.widgetType,
          metricKey: w.metricKey,
          title: w.title,
          position: w.position,
          config: w.config,
        }));
      }
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        name,
        description,
        templateId,
        visibility,
        userId: user.id,
        teamId: visibility === 'TEAM' ? teamId : null,
        layout: { columns: 4, rowHeight: 120 },
        config: { timeRange: 7, refreshInterval: 60 },
        widgets: {
          create: widgetsToCreate.map((w: any) => ({
            widgetType: w.widgetType,
            metricKey: w.metricKey,
            title: w.title || null,
            position: w.position || { x: 0, y: 0, w: 1, h: 1 },
            config: w.config || {},
          })),
        },
      },
      include: { widgets: true },
    });

    return NextResponse.json({ success: true, dashboard }, { status: 201 });
  } catch (error) {
    console.error('[Dashboards API] POST Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
