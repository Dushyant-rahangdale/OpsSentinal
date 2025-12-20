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
    if (!hasApiScopes(apiKey.scopes, ['schedules:read'])) {
        return NextResponse.json({ error: 'API key missing scope: schedules:read.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get('limit'));

    const schedules = await prisma.onCallSchedule.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            name: true,
            timeZone: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return NextResponse.json({ schedules }, { status: 200 });
}
