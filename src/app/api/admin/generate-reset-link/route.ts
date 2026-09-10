import { NextRequest } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-url';
import { jsonError, jsonOk } from '@/lib/api-response';
import { AppError, isAppError } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { assertAdmin } from '@/lib/rbac';
import { getClientIp } from '@/lib/client-ip';
import { emitAuditEvent } from '@/lib/audit';

const schema = z.object({ userId: z.string().trim().min(1).max(128) }).strict();

async function postGenerateResetLink(req: NextRequest) {
  try {
    const sessionUser = await assertAdmin();
    const ip = getClientIp(req.headers);
    const { checkRateLimit } = await import('@/lib/password-reset');

    await checkRateLimit(sessionUser.email, ip, 'ADMIN_GENERATED_RESET_LINK');

    const contentLength = Number(req.headers.get('content-length') || '0');
    if (Number.isFinite(contentLength) && contentLength > 4096) {
      return jsonError(
        new AppError({
          code: 'VALIDATION_FAILED',
          userMessage: 'Please check your input and try again.',
        })
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(
        new AppError({
          code: 'INVALID_JSON',
          userMessage: 'Please check your input and try again.',
        })
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        new AppError({
          code: 'VALIDATION_FAILED',
          userMessage: 'User ID is required',
          fields: [{ field: 'userId', code: 'invalid', message: 'User ID is invalid' }],
        })
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true },
    });
    if (!user) {
      return jsonError(
        new AppError({
          code: 'RESOURCE_NOT_FOUND',
          userMessage: 'User not found',
          details: { resource: 'user', userId: parsed.data.userId },
        })
      );
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const identifier = user.email.toLowerCase();

    await prisma.$transaction(async tx => {
      await tx.userToken.deleteMany({
        where: {
          type: 'PASSWORD_RESET',
          usedAt: null,
          OR: [{ userId: user.id }, { identifier }],
        },
      });
      await tx.userToken.create({
        data: {
          identifier: user.id,
          userId: user.id,
          type: 'PASSWORD_RESET',
          tokenHash,
          expiresAt,
          metadata: { generatedBy: sessionUser.id },
        },
      });
    });

    // Session revocation occurs atomically with the eventual password mutation,
    // not merely when an administrator generates a recovery capability.
    const appUrl = (await getAppUrl()).replace(/\/$/, '');
    const resetLink = `${appUrl}/reset-password#token=${encodeURIComponent(token)}`;

    await emitAuditEvent({
      action: 'ADMIN_GENERATED_RESET_LINK',
      source: 'API',
      target: { type: 'USER', id: user.id },
      actor: {
        type: 'USER',
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
      },
      targetEmail: user.email,
      ip,
      metadata: { generatedFor: user.id },
    });

    return jsonOk({ link: resetLink }, 200);
  } catch (error) {
    if (isAppError(error)) return jsonError(error);
    logger.error('API Error /admin/generate-reset-link', {
      error,
      errorCode: 'INTERNAL_ERROR',
    });
    return jsonError('Internal Server Error', 500);
  }
}

export const POST = withRequestContext(postGenerateResetLink, 'api.admin.generate-reset-link');
