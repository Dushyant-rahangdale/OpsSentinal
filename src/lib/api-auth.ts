import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashToken } from '@/lib/api-keys';

function extractApiKey(req: NextRequest) {
    const header = req.headers.get('authorization') || '';
    if (header.toLowerCase().startsWith('bearer ')) {
        return header.slice(7).trim();
    }
    if (header.toLowerCase().startsWith('api-key ')) {
        return header.slice(8).trim();
    }
    const direct = req.headers.get('x-api-key');
    return direct?.trim() || null;
}

export async function authenticateApiKey(req: NextRequest) {
    const token = extractApiKey(req);
    if (!token) return null;

    const tokenHash = hashToken(token);
    const apiKey = await prisma.apiKey.findFirst({
        where: { tokenHash, revokedAt: null }
    });

    if (!apiKey) return null;

    await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
    });

    return apiKey;
}

export function hasApiScopes(scopes: string[] | null | undefined, required: string[]) {
    if (!scopes || scopes.length === 0) return false;
    return required.every((scope) => scopes.includes(scope));
}
