'use server';

import prisma from '@/lib/prisma';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { generateApiKey } from '@/lib/api-keys';
import { validatePasswordStrength } from '@/lib/passwords';
import { getEmailConfig, getSMSConfig, getPushConfig, getWhatsAppConfig } from '@/lib/notification-providers';
import { logger } from '@/lib/logger';


type ActionState = {
    error?: string | null;
    success?: boolean;
    token?: string | null;
};

async function getCurrentUser() {
    const session = await getServerSession(await getAuthOptions());
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

        // Don't update if name hasn't changed
        if (user.name === name) {
            return { success: true };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { name }
        });

        // Revalidate multiple paths to ensure UI updates everywhere
        revalidatePath('/settings/profile');
        revalidatePath('/settings');
        revalidatePath('/');
        revalidatePath('/incidents');
        revalidatePath('/users');
        revalidatePath('/policies');
        revalidatePath('/schedules');
        // Revalidate layout to update topbar
        revalidatePath('/', 'layout');

        return { success: true };
    } catch (error) {
        logger.error('Error updating profile', { component: 'settings-actions', error });
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
                incidentDigest: digest as any // eslint-disable-line @typescript-eslint/no-explicit-any
            }
        });

        revalidatePath('/settings/preferences');
        return { success: true };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to update preferences.' };
    }
}

export async function updateNotificationPreferences(_prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const user = await getCurrentUser();

        const emailEnabled = formData.get('emailNotificationsEnabled') === 'on';
        const smsEnabled = formData.get('smsNotificationsEnabled') === 'on';
        const pushEnabled = formData.get('pushNotificationsEnabled') === 'on';
        const whatsappEnabled = formData.get('whatsappNotificationsEnabled') === 'on';
        // Phone number can come from SMS or WhatsApp field (they share the same number)
        const phoneNumber = (formData.get('phoneNumber') as string | null)?.trim() ||
            (formData.get('phoneNumberWhatsApp') as string | null)?.trim() || null;

        // Check provider availability
        if (emailEnabled) {
            const emailConfig = await getEmailConfig();
            if (!emailConfig.enabled) {
                return { error: 'Email notifications cannot be enabled because no email provider is configured.' };
            }
        }

        if (smsEnabled) {
            const smsConfig = await getSMSConfig();
            if (!smsConfig.enabled) {
                return { error: 'SMS notifications cannot be enabled because no SMS provider is configured.' };
            }
        }

        if (pushEnabled) {
            const pushConfig = await getPushConfig();
            if (!pushConfig.enabled) {
                return { error: 'Push notifications cannot be enabled because no push notification provider is configured.' };
            }
        }

        if (whatsappEnabled) {
            const whatsappConfig = await getWhatsAppConfig();
            if (!whatsappConfig.enabled) {
                return { error: 'WhatsApp notifications cannot be enabled because no WhatsApp provider is configured.' };
            }
        }

        // Validate phone number if SMS or WhatsApp is enabled
        if ((smsEnabled || whatsappEnabled) && phoneNumber) {
            // Basic E.164 format validation
            const phoneRegex = /^\+[1-9]\d{1,14}$/;
            if (!phoneRegex.test(phoneNumber)) {
                return { error: 'Phone number must be in E.164 format (e.g., +1234567890)' };
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailNotificationsEnabled: emailEnabled,
                smsNotificationsEnabled: smsEnabled,
                pushNotificationsEnabled: pushEnabled,
                whatsappNotificationsEnabled: whatsappEnabled,
                phoneNumber: (smsEnabled || whatsappEnabled) ? phoneNumber : null
            }
        });

        revalidatePath('/settings/preferences');
        return { success: true };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to update notification preferences.' };
    }
}

export async function updatePassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const user = await getCurrentUser();
        const currentPassword = (formData.get('currentPassword') as string | null) ?? '';
        const newPassword = (formData.get('newPassword') as string | null) ?? '';
        const confirmPassword = (formData.get('confirmPassword') as string | null) ?? '';

        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) {
            return { error: passwordError };
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
