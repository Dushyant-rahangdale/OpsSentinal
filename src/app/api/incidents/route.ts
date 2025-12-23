import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiKey, hasApiScopes } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api-response';
import { IncidentCreateSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

function parseLimit(value: string | null) {
    const limit = Number(value);
    if (Number.isNaN(limit) || limit <= 0) return 50;
    return Math.min(limit, 200);
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

async function getApiUserContext(apiKeyUserId: string) {
    const user = await prisma.user.findUnique({
        where: { id: apiKeyUserId },
        select: {
            id: true,
            role: true,
            teamMemberships: { select: { teamId: true } }
        }
    });

    if (!user) return null;

    return {
        id: user.id,
        role: user.role,
        teamIds: user.teamMemberships.map((membership) => membership.teamId)
    };
}

export async function GET(req: NextRequest) {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
        return jsonError('Unauthorized. Missing or invalid API key.', 401);
    }
    if (!hasApiScopes(apiKey.scopes, ['incidents:read'])) {
        return jsonError('API key missing scope: incidents:read.', 403);
    }

    const rate = checkRateLimit(`api:${apiKey.id}:incidents:get`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
        const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
        return NextResponse.json(
            { error: 'Rate limit exceeded.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
    }

    const apiUser = await getApiUserContext(apiKey.userId);
    if (!apiUser) {
        return jsonError('Unauthorized. API key user not found.', 401);
    }

    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get('limit'));

    const accessFilter = apiUser.role === 'ADMIN' || apiUser.role === 'RESPONDER'
        ? undefined
        : {
            OR: [
                { assigneeId: apiUser.id },
                { service: { teamId: { in: apiUser.teamIds } } }
            ]
        };

    const incidents = await prisma.incident.findMany({
        where: accessFilter,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            service: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } }
        }
    });

    return jsonOk({ incidents }, 200);
}

export async function POST(req: NextRequest) {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
        return jsonError('Unauthorized. Missing or invalid API key.', 401);
    }
    if (!hasApiScopes(apiKey.scopes, ['incidents:write'])) {
        return jsonError('API key missing scope: incidents:write.', 403);
    }

    const rate = checkRateLimit(`api:${apiKey.id}:incidents:post`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
        const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
        return NextResponse.json(
            { error: 'Rate limit exceeded.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
    }

    const apiUser = await getApiUserContext(apiKey.userId);
    if (!apiUser) {
        return jsonError('Unauthorized. API key user not found.', 401);
    }

    let body: any;
    try {
        body = await req.json();
    } catch (error) {
        return jsonError('Invalid JSON in request body.', 400);
    }
    const parsed = IncidentCreateSchema.safeParse({
        title: body.title,
        description: body.description ?? null,
        serviceId: body.serviceId,
        urgency: body.urgency,
        priority: body.priority ?? null
    });

    if (!parsed.success) {
        return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
    }

    const { title, description, serviceId, urgency, priority } = parsed.data;

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
        return jsonError('Service not found.', 404);
    }

    if (apiUser.role !== 'ADMIN' && apiUser.role !== 'RESPONDER') {
        if (!service.teamId || !apiUser.teamIds.includes(service.teamId)) {
            return jsonError('Forbidden. Service access denied.', 403);
        }
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

    logger.info('api.incident.created', { incidentId: incident.id, serviceId: incident.serviceId, apiKeyId: apiKey.id });
    return jsonOk({ incident }, 201);
}
