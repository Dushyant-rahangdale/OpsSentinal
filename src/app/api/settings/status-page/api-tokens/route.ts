import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { assertAdmin } from '@/lib/rbac';
import { jsonError, jsonOk } from '@/lib/api-response';
import { StatusApiTokenCreateSchema, StatusApiTokenRevokeSchema } from '@/lib/validation';
import { generateApiKey } from '@/lib/api-keys';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        await assertAdmin();
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : 'Unauthorized', 403);
    }

    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return jsonError('Invalid JSON in request body.', 400);
        }

        const parsed = StatusApiTokenCreateSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
        }

        const { statusPageId, name } = parsed.data;
        const { token, prefix, tokenHash } = generateApiKey();

        const apiToken = await prisma.statusPageApiToken.create({
            data: {
                statusPageId,
                name: name.trim(),
                prefix,
                tokenHash,
            },
        });

        logger.info('api.status_page.api_token.created', { apiTokenId: apiToken.id });
        return jsonOk({ token, apiToken }, 200);
    } catch (error: any) {
        logger.error('api.status_page.api_token.create_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to create token', 500);
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await assertAdmin();
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : 'Unauthorized', 403);
    }

    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return jsonError('Invalid JSON in request body.', 400);
        }

        const parsed = StatusApiTokenRevokeSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
        }

        const { id } = parsed.data;
        const apiToken = await prisma.statusPageApiToken.update({
            where: { id },
            data: { revokedAt: new Date() },
        });

        logger.info('api.status_page.api_token.revoked', { apiTokenId: apiToken.id });
        return jsonOk({ apiToken }, 200);
    } catch (error: any) {
        logger.error('api.status_page.api_token.revoke_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to revoke token', 500);
    }
}
