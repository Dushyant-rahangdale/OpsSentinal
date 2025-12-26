import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * Subscribe to Status Page Updates (Public API)
 * POST /api/status/subscribe
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { statusPageId, email } = body;

        if (!statusPageId || !email || !email.includes('@')) {
            return jsonError('Valid statusPageId and email are required', 400);
        }

        // Verify status page exists and is enabled
        const statusPage = await prisma.statusPage.findFirst({
            where: { id: statusPageId, enabled: true },
        });

        if (!statusPage) {
            return jsonError('Status page not found or disabled', 404);
        }

        // Redirect to status page subscribe endpoint
        // This endpoint exists for API compatibility
        const response = await fetch(`${req.nextUrl.origin}/api/status-page/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statusPageId, email }),
        });

        const data = await response.json();
        return jsonOk(data, response.status);
    } catch (error: any) {
        logger.error('api.status.subscribe.error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to subscribe', 500);
    }
}

