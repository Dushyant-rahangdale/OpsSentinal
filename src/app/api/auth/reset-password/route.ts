import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // 1. Verify Token
    // The token passed in query param is the raw random bytes (hex).
    // The DB stores the SHA256 hash of it.
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const record = await prisma.userToken.findFirst({
      where: {
        tokenHash,
        type: { in: ['PASSWORD_RESET', 'ADMIN_RESET_LINK'] },
        usedAt: null,
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Check expiration
    if (record.expiresAt < new Date()) {
      // Delete expired token to cleanup
      await prisma.userToken.delete({ where: { tokenHash } });
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    const email = record.identifier;

    // 2. Update User Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Token exists but user doesn't: mark token used so it can't be replayed
      await prisma.userToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        invitedAt: null,
        deactivatedAt: null,
      },
    });

    // 3. Cleanup Token
    await prisma.userToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });

    // 4. Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'USER',
        entityId: user.id,
        actorId: user.id,
        details: { email },
      },
    });

    return NextResponse.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    logger.error('API Error /auth/reset-password', { error });
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
