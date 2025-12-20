'use server';

import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { generateApiKey } from '@/lib/api-keys';

type ActionState = {
    error?: string | null;
    success?: boolean;
    token?: string | null;
};

async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
        throw new Error('Unauthorized');
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
}

export async function updateProfile(_prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const user = await getCurrentUser();
        const name = (formData.get('name') as string | null)?.trim() ?? '';

        if (name.length < 2) {
            return { error: 'Name must be at least 2 characters.' };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { name }
        });

        revalidatePath('/settings/profile');
        return { success: true };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to update profile.' };
    }
}

export async function updatePreferences(_prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const user = await getCurrentUser();
        const timeZone = (formData.get('timeZone') as string | null)?.trim() ?? 'UTC';
        const dailySummary = formData.get('dailySummary') === 'on';
        const digest = (formData.get('incidentDigest') as string | null)?.toUpperCase() ?? 'HIGH';
        const allowedDigests = new Set(['HIGH', 'ALL', 'NONE']);

        if (!allowedDigests.has(digest)) {
            return { error: 'Invalid digest option.' };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                timeZone,
                dailySummary,
                incidentDigest: digest as any
            }
        });

        revalidatePath('/settings/preferences');
        return { success: true };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to update preferences.' };
    }
}

export async function updatePassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const user = await getCurrentUser();
        const currentPassword = (formData.get('currentPassword') as string | null) ?? '';
        const newPassword = (formData.get('newPassword') as string | null) ?? '';
        const confirmPassword = (formData.get('confirmPassword') as string | null) ?? '';

        if (newPassword.length < 8) {
            return { error: 'Password must be at least 8 characters.' };
        }

        if (newPassword !== confirmPassword) {
            return { error: 'Passwords do not match.' };
        }

        if (user.passwordHash) {
            const valid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!valid) {
                return { error: 'Current password is incorrect.' };
            }
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });

        revalidatePath('/settings/security');
        return { success: true };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to update password.' };
    }
}

export async function createApiKey(_prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const user = await getCurrentUser();
        const name = (formData.get('name') as string | null)?.trim() ?? '';
        const scopes = formData.getAll('scopes').filter(Boolean) as string[];
        const allowedScopes = new Set(['events:write', 'incidents:read', 'incidents:write', 'services:read', 'schedules:read']);
        const finalScopes = scopes.length > 0 ? scopes.filter((scope) => allowedScopes.has(scope)) : ['events:write'];

        if (!name) {
            return { error: 'Name is required.' };
        }

        const { token, prefix, tokenHash } = generateApiKey();

        await prisma.apiKey.create({
            data: {
                name,
                prefix,
                tokenHash,
                scopes: finalScopes,
                userId: user.id
            }
        });

        revalidatePath('/settings/api-keys');
        return { success: true, token };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to create API key.' };
    }
}

export async function revokeApiKey(formData: FormData) {
    const keyId = formData.get('keyId') as string | null;
    if (!keyId) {
        return;
    }

    const user = await getCurrentUser();
    await prisma.apiKey.updateMany({
        where: {
            id: keyId,
            userId: user.id,
            revokedAt: null
        },
        data: {
            revokedAt: new Date()
        }
    });

    revalidatePath('/settings/api-keys');
}
