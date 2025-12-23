import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiKey, hasApiScopes } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized. Missing or invalid API key.' }, { status: 401 });
    }
    if (!hasApiScopes(apiKey.scopes, ['schedules:read'])) {
        return NextResponse.json({ error: 'API key missing scope: schedules:read.' }, { status: 403 });
    }

    const { id } = await params;
    const schedule = await prisma.onCallSchedule.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            timeZone: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!schedule) {
        return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 });
    }

    return NextResponse.json({ schedule }, { status: 200 });
}
