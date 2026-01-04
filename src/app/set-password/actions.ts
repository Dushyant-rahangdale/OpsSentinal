'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { logAudit } from '@/lib/audit';
import { validatePasswordStrength } from '@/lib/passwords';
import { createHash } from 'crypto';

export async function setPassword(formData: FormData) {
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!token) {
    redirect('/set-password?error=missing');
  }

  const passwordError = validatePasswordStrength(password || '');
  if (passwordError) {
    const code = passwordError.includes('include') ? 'complexity' : 'weak';
    redirect(`/set-password?token=${encodeURIComponent(token)}&error=${code}`);
  }

  if (password !== confirmPassword) {
    redirect(`/set-password?token=${encodeURIComponent(token)}&error=mismatch`);
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = await prisma.userToken.findFirst({
    where: {
      tokenHash,
      type: 'INVITE',
      usedAt: null,
    },
  });

  if (!record || record.expiresAt < new Date()) {
    redirect('/set-password?error=expired');
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
  });

  if (!user) {
    redirect('/set-password?error=invalid');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      status: 'ACTIVE',
      invitedAt: null,
      deactivatedAt: null,
    },
  });

  await prisma.userToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });

  await logAudit({
    action: 'user.password.set',
    entityType: 'USER',
    entityId: user.id,
    actorId: null,
    details: { method: 'invite' },
  });

  // Force sign-out effectively by redirecting to signout or letting the frontend handle it.
  // Since this is a server action, we can't easily clear the cookie domain-wide without auth hooks.
  // However, redirecting to the sign-out route with a callback to login is a safe way to ensure fresh session.
  redirect('/api/auth/signout?callbackUrl=/login?password=1');
}
