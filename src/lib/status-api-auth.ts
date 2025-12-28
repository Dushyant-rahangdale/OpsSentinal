import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashToken } from '@/lib/api-keys';
import { checkRateLimit } from '@/lib/rate-limit';

type StatusApiAuthResult = {
    allowed: boolean;
    tokenId?: string;
    error?: string;
    status?: number;
    retryAfter?: number;
};

const DEFAULT_RATE_LIMIT_MAX = 120;
const DEFAULT_RATE_LIMIT_WINDOW_SEC = 60;

function extractToken(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }
    const tokenParam = req.nextUrl.searchParams.get('token');
    if (tokenParam) {
        return tokenParam.trim();
    }
    return null;
}

function getRateLimitKey(req: NextRequest, tokenHash?: string | null) {
    if (tokenHash) {
        return `status-api:token:${tokenHash}`;
    }
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim();
    return `status-api:ip:${ip || 'unknown'}`;
}

export async function authorizeStatusApiRequest(req: NextRequest, statusPageId: string, options: {
    requireToken: boolean;
    rateLimitEnabled: boolean;
    rateLimitMax?: number | null;
    rateLimitWindowSec?: number | null;
}) : Promise<StatusApiAuthResult> {
    const token = extractToken(req);
    let tokenHash: string | null = null;
    let tokenRecord: { id: string } | null = null;

    if (token) {
        tokenHash = hashToken(token);
        tokenRecord = await prisma.statusPageApiToken.findFirst({
            where: {
                statusPageId,
                tokenHash,
                revokedAt: null,
            },
            select: { id: true },
        });
    }

    if (options.requireToken && !tokenRecord) {
        return { allowed: false, error: 'API token required', status: 401 };
    }

    if (tokenRecord) {
        await prisma.statusPageApiToken.update({
            where: { id: tokenRecord.id },
            data: { lastUsedAt: new Date() },
        });
    }

    if (options.rateLimitEnabled) {
        const limit = options.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX;
        const windowMs = (options.rateLimitWindowSec ?? DEFAULT_RATE_LIMIT_WINDOW_SEC) * 1000;
        const rateKey = getRateLimitKey(req, tokenHash);
        const rate = checkRateLimit(rateKey, limit, windowMs);
        if (!rate.allowed) {
            const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
            return { allowed: false, error: 'Rate limit exceeded', status: 429, retryAfter };
        }
    }

    return { allowed: true, tokenId: tokenRecord?.id };
}
