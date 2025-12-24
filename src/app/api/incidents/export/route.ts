import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await assertResponderOrAbove();
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unauthorized' },
            { status: 403 }
        );
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all_open';
    const search = searchParams.get('search') || '';
    const priority = searchParams.get('priority') || 'all';
    const urgency = searchParams.get('urgency') || 'all';

    let where: any = {};
    if (filter === 'mine') {
        where = {
            assigneeId: (session.user as any).id,
            status: { notIn: ['RESOLVED'] }
        };
    } else if (filter === 'all_open') {
        where = { status: { notIn: ['RESOLVED', 'SNOOZED', 'SUPPRESSED'] } };
    } else if (filter === 'resolved') {
        where = { status: 'RESOLVED' };
    } else if (filter === 'snoozed') {
        where = { status: 'SNOOZED' };
    } else if (filter === 'suppressed') {
        where = { status: 'SUPPRESSED' };
    }

    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } }
        ];
    }

    if (priority !== 'all') {
        where.priority = priority;
    }

    if (urgency !== 'all') {
        where.urgency = urgency;
    }

    const incidents = await prisma.incident.findMany({
        where,
        include: {
            service: true,
            assignee: true
        },
        orderBy: { createdAt: 'desc' }
    });

    // Convert to CSV
    const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Urgency', 'Service', 'Assignee', 'Created At', 'Updated At', 'Resolved At'];
    const rows = incidents.map(incident => [
        incident.id,
        incident.title,
        incident.description || '',
        incident.status,
        incident.priority || '',
        incident.urgency,
        incident.service.name,
        incident.assignee?.name || 'Unassigned',
        incident.createdAt.toISOString(),
        incident.updatedAt.toISOString(),
        incident.resolvedAt?.toISOString() || ''
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="incidents-${new Date().toISOString().split('T')[0]}.csv"`
        }
    });
}









