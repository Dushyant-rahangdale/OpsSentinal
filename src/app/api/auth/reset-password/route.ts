import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { completePasswordReset } from '@/lib/password-reset';
import { PASSWORD_MAX_LENGTH } from '@/lib/passwords';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/client-ip';

const schema = z
  .object({
    token: z.string().min(32).max(512),
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  })
  .strict();

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || '0');
    if (Number.isFinite(contentLength) && contentLength > 8192) {
      return json({ error: 'Invalid reset request.' }, 400);
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid reset request.' }, 400);
    const result = await completePasswordReset(
      parsed.data.token,
      parsed.data.password,
      getClientIp(req.headers)
    );
    if (!result.success) {
      return json(
        { error: result.error || 'Unable to reset password.' },
        result.code === 'RATE_LIMITED' ? 429 : result.code === 'INTERNAL' ? 500 : 400
      );
    }
    return json({ message: result.message }, 200);
  } catch (error) {
    logger.error('auth.password_reset.complete_route_failed', {
      component: 'reset-password-route',
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: 'Unable to reset password.' }, 500);
  }
}
