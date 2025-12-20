import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiKey, hasApiScopes } from '@/lib/api-auth';

function parseLimit(value: string | null) {
    const limit = Number(value);
    if (Number.isNaN(limit) || limit <= 0) return 50;
    return Math.min(limit, 200);
}

export async function GET(req: NextRequest) {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized. Missing or invalid API key.' }, { status: 401 });
    }
    if (!hasApiScopes(apiKey.scopes, ['incidents:read'])) {
        return NextResponse.json({ error: 'API key missing scope: incidents:read.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get('limit'));

    const incidents = await prisma.incident.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            service: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } }
        }
    });

    return NextResponse.json({ incidents }, { status: 200 });
}

export async function POST(req: NextRequest) {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized. Missing or invalid API key.' }, { status: 401 });
    }
    if (!hasApiScopes(apiKey.scopes, ['incidents:write'])) {
        return NextResponse.json({ error: 'API key missing scope: incidents:write.' }, { status: 403 });
    }

    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const serviceId = typeof body.serviceId === 'string' ? body.serviceId : '';
    const urgency = body.urgency === 'LOW' ? 'LOW' : 'HIGH';
    const priority = typeof body.priority === 'string' ? body.priority : null;

    if (!title || !serviceId) {
        return NextResponse.json({ error: 'title and serviceId are required.' }, { status: 400 });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
        return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
    }

    const incident = await prisma.incident.create({
        data: {
            title,
            description,
            urgency,
            priority,
            status: 'OPEN',
            serviceId
        }
    });

    return NextResponse.json({ incident }, { status: 201 });
}
