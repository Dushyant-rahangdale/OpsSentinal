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
    orderBy: { provider: 'asc' },
  });

  // Return providers with decrypted config (for now, just return as-is)
  // In production, you'd decrypt here
  return providers.map(p => ({
    id: p.id,
    provider: p.provider,
    enabled: p.enabled,
    config: (p.config as Record<string, unknown>) || {},
    updatedAt: p.updatedAt.toISOString(),
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
    throw new Error(
      error instanceof Error ? error.message : 'Unauthorized. Admin access required.'
    );
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
        updatedBy: user.id,
      },
    });
  } else {
    // Create new
    await prisma.notificationProvider.upsert({
      where: { provider },
      create: {
        provider,
        enabled,
        config: encryptedConfig,
        updatedBy: user.id,
      },
      update: {
        enabled,
        config: encryptedConfig,
        updatedBy: user.id,
      },
    });
  }

  revalidatePath('/settings/system');
  return { success: true };
}

/**
 * Save OIDC/SSO configuration
 */
function normalizeDomains(value: string) {
  if (!value) return [];
  return value
    .split(/[\n,\s]+/)
    .map(domain => domain.trim().toLowerCase())
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
    return {
      error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.',
    };
  }

  const { getEncryptionKey, encrypt } = await import('@/lib/encryption');

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

    if (allowedDomains.length > 0 && allowedDomains.some(domain => !isValidDomain(domain))) {
      return { error: 'Allowed domains must be valid domain names.' };
    }
  }

  const existing = await prisma.oidcConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
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
      updatedBy: actorId,
    },
    update: {
      issuer,
      clientId,
      ...(encryptedSecret ? { clientSecret: encryptedSecret } : {}),
      enabled,
      autoProvision,
      allowedDomains,
      updatedBy: actorId,
    },
  });

  await import('@/lib/audit').then(m =>
    m.logAudit({
      action: 'oidc.config.updated',
      entityType: 'USER',
      entityId: user.id,
      actorId,
      details: {
        enabled,
        autoProvision,
        issuer,
        allowedDomainsCount: allowedDomains.length,
      },
    })
  );

  revalidatePath('/settings/system');
  revalidatePath('/login');

  return { success: true };
}

/**
 * Save System Encryption Key
 */
export async function saveEncryptionKey(
  prevState: { error?: string | null; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string | null; success?: boolean }> {
  try {
    await assertAdmin();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.',
    };
  }

  const key = (formData.get('encryptionKey') as string | null)?.trim() ?? '';

  if (!key) {
    return { error: 'Encryption key is required.' };
  }

  // Validate hex format (32 bytes = 64 hex chars)
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    return { error: 'Invalid key format. Must be a 32-byte (64 character) hex string.' };
  }

  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    create: { encryptionKey: key },
    update: { encryptionKey: key },
  });

  const user = await getCurrentUser();
  await import('@/lib/audit').then(m =>
    m.logAudit({
      action: 'system.encryption_key.updated',
      entityType: 'USER',
      entityId: user.id,
      actorId: user.id,
      details: {
        keyLength: key.length,
      },
    })
  );

  revalidatePath('/settings/system');
  return { success: true };
}
