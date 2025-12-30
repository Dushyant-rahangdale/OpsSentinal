import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiKey, hasApiScopes } from '@/lib/api-auth';
import { jsonError, jsonOk } from '@/lib/api-response';

function parseLimit(value: string | null) {
  const limit = Number(value);
  if (Number.isNaN(limit) || limit <= 0) return 50;
  return Math.min(limit, 200);
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
      return jsonError('Unauthorized. Missing or invalid API key.', 401);
    }
    if (!hasApiScopes(apiKey.scopes, ['services:read'])) {
      return jsonError('API key missing scope: services:read.', 403);
    }

    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get('limit'));

    const services = await prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        teamId: true,
        escalationPolicyId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonOk({ services });
  } catch (error: any) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    return jsonError(error.message || 'Internal Server Error', 500);
  }
}
