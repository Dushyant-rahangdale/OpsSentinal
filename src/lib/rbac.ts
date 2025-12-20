import 'server-only';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Role } from '@prisma/client';

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        throw new Error('Unauthorized');
    }
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true, email: true, name: true }
    });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
}

export async function assertAdmin() {
    const user = await getCurrentUser();
    if (user.role !== 'ADMIN') {
        throw new Error('Unauthorized. Admin access required.');
    }
    return user;
}

export async function assertAdminOrResponder() {
    const user = await getCurrentUser();
    if (user.role !== 'ADMIN' && user.role !== 'RESPONDER') {
        throw new Error('Unauthorized. Admin or Responder access required.');
    }
    return user;
}

export async function assertResponderOrAbove() {
    const user = await getCurrentUser();
    if (user.role !== 'ADMIN' && user.role !== 'RESPONDER') {
        throw new Error('Unauthorized. Responder access or above required.');
    }
    return user;
}

export async function assertNotSelf(currentUserId: string, targetUserId: string, action: string) {
    if (currentUserId === targetUserId) {
        throw new Error(`You cannot ${action} your own account.`);
    }
}

export async function getUserPermissions() {
    try {
        const user = await getCurrentUser();
        return {
            id: user.id,
            role: user.role as Role,
            isAdmin: user.role === 'ADMIN',
            isAdminOrResponder: user.role === 'ADMIN' || user.role === 'RESPONDER',
            isResponderOrAbove: user.role === 'ADMIN' || user.role === 'RESPONDER'
        };
    } catch {
        return {
            id: '',
            role: 'USER' as Role,
            isAdmin: false,
            isAdminOrResponder: false,
            isResponderOrAbove: false
        };
    }
}

