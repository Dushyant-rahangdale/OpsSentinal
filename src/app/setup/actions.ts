'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { redirect } from 'next/navigation';
import { logAudit, getDefaultActorId } from '@/lib/audit';

export async function bootstrapAdmin(formData: FormData) {
    const name = formData.get('name') as string;
    const email = (formData.get('email') as string)?.toLowerCase().trim();

    if (!name || !email) {
        return { error: 'Name and email are required.' };
    }

    const existing = await prisma.user.count();
    if (existing > 0) {
        redirect('/login');
    }

    const password = randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            role: 'ADMIN',
            status: 'ACTIVE',
            passwordHash,
            invitedAt: null,
            deactivatedAt: null
        }
    });

    await logAudit({
        action: 'user.bootstrap',
        entityType: 'USER',
        entityId: user.id,
        actorId: await getDefaultActorId(),
        details: { email }
    });

    return { success: true, password, email };
}
