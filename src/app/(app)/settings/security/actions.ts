'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { assertAdmin, getCurrentUser } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { encrypt, getEncryptionKey } from '@/lib/encryption';

function normalizeDomains(value: string) {
    if (!value) return [];
    return value
        .split(/[\n,\s]+/)
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean);
}

function isValidIssuer(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isValidDomain(domain: string) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}

export async function saveOidcConfig(
    prevState: { error?: string | null; success?: boolean } | undefined,
    formData: FormData
): Promise<{ error?: string | null; success?: boolean }> {
    try {
        await assertAdmin();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.' };
    }

    const issuer = (formData.get('issuer') as string | null)?.trim() ?? '';
    const clientId = (formData.get('clientId') as string | null)?.trim() ?? '';
    const clientSecret = (formData.get('clientSecret') as string | null)?.trim() ?? '';
    const enabledValue = formData.get('enabled');
    const autoProvisionValue = formData.get('autoProvision');
    const enabled = enabledValue === 'on' || enabledValue === 'true';
    const autoProvision = autoProvisionValue === 'on' || autoProvisionValue === 'true';
    const allowedDomainsInput = (formData.get('allowedDomains') as string | null) ?? '';
    const allowedDomains = normalizeDomains(allowedDomainsInput);

    if (enabled) {
        if (!issuer || !isValidIssuer(issuer)) {
            return { error: 'Issuer URL must be a valid HTTPS URL.' };
        }

        if (!clientId) {
            return { error: 'Client ID is required.' };
        }

        if (allowedDomains.length > 0 && allowedDomains.some((domain) => !isValidDomain(domain))) {
            return { error: 'Allowed domains must be valid domain names.' };
        }
    }

    const existing = await prisma.oidcConfig.findFirst({
        orderBy: { updatedAt: 'desc' }
    });

    const encryptionKey = await getEncryptionKey();

    if (enabled && !encryptionKey) {
        return { error: 'ENCRYPTION_KEY must be set before enabling SSO.' };
    }

    if (clientSecret && !encryptionKey) {
        return { error: 'ENCRYPTION_KEY must be set before saving the client secret.' };
    }

    if (!existing && enabled && !clientSecret) {
        return { error: 'Client Secret is required for new configuration.' };
    }

    let encryptedSecret = existing?.clientSecret ?? null;
    if (clientSecret && clientSecret !== '********') {
        encryptedSecret = await encrypt(clientSecret);
    } else if (enabled && !encryptedSecret) {
        return { error: 'Client Secret is required for new configuration.' };
    }

    const user = await getCurrentUser();
    const actorId = user.id;

    await prisma.oidcConfig.upsert({
        where: { id: existing?.id || 'default' },
        create: {
            id: 'default',
            issuer,
            clientId,
            clientSecret: encryptedSecret || '',
            enabled,
            autoProvision,
            allowedDomains,
            updatedBy: actorId
        },
        update: {
            issuer,
            clientId,
            ...(encryptedSecret ? { clientSecret: encryptedSecret } : {}),
            enabled,
            autoProvision,
            allowedDomains,
            updatedBy: actorId
        }
    });

    await logAudit({
        action: 'oidc.config.updated',
        entityType: 'USER',
        entityId: user.id,
        actorId,
        details: {
            enabled,
            autoProvision,
            issuer,
            allowedDomainsCount: allowedDomains.length
        }
    });

    revalidatePath('/settings/security');
    revalidatePath('/login');

    return { success: true };
}
