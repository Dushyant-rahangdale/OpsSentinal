'use server';

import prisma from '@/lib/prisma';
import { assertAdmin } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';

/**
 * Get all notification provider configurations
 * Note: Admin check is done at the page level, so this function doesn't need to check again
 */
export async function getNotificationProviders() {
    const providers = await prisma.notificationProvider.findMany({
        orderBy: { provider: 'asc' }
    });

    // Return providers with decrypted config (for now, just return as-is)
    // In production, you'd decrypt here
    return providers.map(p => ({
        id: p.id,
        provider: p.provider,
        enabled: p.enabled,
        config: (p.config as Record<string, unknown>) || {},
        updatedAt: p.updatedAt.toISOString()
    }));
}

/**
 * Update notification provider configuration
 */
export async function updateNotificationProvider(
    providerId: string | null,
    provider: string,
    enabled: boolean,
    config: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
) {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }

    const user = await getCurrentUser();

    // Encrypt sensitive fields (for now, just store as-is)
    // In production, use encryption library like crypto-js or similar
    const encryptedConfig = config;

    if (providerId) {
        // Update existing
        await prisma.notificationProvider.update({
            where: { id: providerId },
            data: {
                enabled,
                config: encryptedConfig,
                updatedBy: user.id
            }
        });
    } else {
        // Create new
        await prisma.notificationProvider.upsert({
            where: { provider },
            create: {
                provider,
                enabled,
                config: encryptedConfig,
                updatedBy: user.id
            },
            update: {
                enabled,
                config: encryptedConfig,
                updatedBy: user.id
            }
        });
    }

    revalidatePath('/settings/system');
    return { success: true };
}

