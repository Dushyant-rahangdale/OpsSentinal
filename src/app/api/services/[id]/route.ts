import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateApiKey, hasApiScopes } from '@/lib/api-auth';
import { jsonError, jsonOk } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
      return jsonError('Unauthorized. Missing or invalid API key.', 401);
    }
    if (!hasApiScopes(apiKey.scopes, ['services:read'])) {
      return jsonError('API key missing scope: services:read.', 403);
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
        updatedAt: true,
      },
    });

    if (!service) {
      return jsonError('Service not found.', 404);
    }

    return jsonOk({ service });
  } catch (error: any) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    return jsonError(error.message || 'Internal Server Error', 500);
  }
}
