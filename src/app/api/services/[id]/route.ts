import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiKey, hasApiScopes } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized. Missing or invalid API key.' }, { status: 401 });
    }
    if (!hasApiScopes(apiKey.scopes, ['services:read'])) {
        return NextResponse.json({ error: 'API key missing scope: services:read.' }, { status: 403 });
    }

    const { id } = await params;
    const service = await prisma.service.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            description: true,
            status: true,
            teamId: true,
            escalationPolicyId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!service) {
        return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
    }

    return NextResponse.json({ service }, { status: 200 });
}
