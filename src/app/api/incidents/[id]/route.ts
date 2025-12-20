import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiKey, hasApiScopes } from '@/lib/api-auth';

type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'SUPPRESSED';
type IncidentUrgency = 'LOW' | 'HIGH';

export async function GET(req: NextRequest, context: { params: { id: string } }) {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized. Missing or invalid API key.' }, { status: 401 });
    }
    if (!hasApiScopes(apiKey.scopes, ['incidents:read'])) {
        return NextResponse.json({ error: 'API key missing scope: incidents:read.' }, { status: 403 });
    }

    const incident = await prisma.incident.findUnique({
        where: { id: context.params.id },
        include: {
            service: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } }
        }
    });

    if (!incident) {
        return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
    }

    return NextResponse.json({ incident }, { status: 200 });
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized. Missing or invalid API key.' }, { status: 401 });
    }
    if (!hasApiScopes(apiKey.scopes, ['incidents:write'])) {
        return NextResponse.json({ error: 'API key missing scope: incidents:write.' }, { status: 403 });
    }

    const body = await req.json();
    const status: IncidentStatus | null = body.status ?? null;
    const urgency: IncidentUrgency | null = body.urgency ?? null;
    const assigneeId: string | null = typeof body.assigneeId === 'string' ? body.assigneeId : null;

    const updates: Record<string, unknown> = {};
    if (status) {
        const valid = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED', 'SUPPRESSED'].includes(status);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
        }
        updates.status = status;
    }
    if (urgency) {
        const valid = ['LOW', 'HIGH'].includes(urgency);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid urgency.' }, { status: 400 });
        }
        updates.urgency = urgency;
    }
    if (assigneeId !== null) {
        updates.assigneeId = assigneeId || null;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const incident = await prisma.incident.update({
        where: { id: context.params.id },
        data: updates
    });

    return NextResponse.json({ incident }, { status: 200 });
}
