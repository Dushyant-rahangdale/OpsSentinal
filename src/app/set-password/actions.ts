'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { logAudit } from '@/lib/audit';
import { validatePasswordStrength } from '@/lib/passwords';

export async function setPassword(formData: FormData) {
    const token = formData.get('token') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!token) {
        redirect('/set-password?error=missing');
    }

    const passwordError = validatePasswordStrength(password || '');
    if (passwordError) {
        redirect(`/set-password?token=${encodeURIComponent(token)}&error=weak`);
    }

    if (password !== confirmPassword) {
        redirect(`/set-password?token=${encodeURIComponent(token)}&error=mismatch`);
    }

    const record = await prisma.verificationToken.findUnique({
        where: { token }
    });

    if (!record || record.expires < new Date()) {
        redirect('/set-password?error=expired');
    }

    const user = await prisma.user.findUnique({
        where: { email: record.identifier }
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
            deactivatedAt: null
        }
    });

    await prisma.verificationToken.delete({
        where: { token }
    });

    await logAudit({
        action: 'user.password.set',
        entityType: 'USER',
        entityId: user.id,
        actorId: null,
        details: { method: 'invite' }
    });

    redirect('/login?password=1');
}
