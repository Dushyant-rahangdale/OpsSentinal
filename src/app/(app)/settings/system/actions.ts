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

  // CRITICAL: Update the fingerprint to match the new key
  // Otherwise the system will lock out writes due to mismatch
  const { getFingerprint } = await import('@/lib/encryption');
  const fingerprint = getFingerprint(key);
  await prisma.systemConfig.upsert({
    where: { key: 'encryption_fingerprint' },
    create: { key: 'encryption_fingerprint', value: { fingerprint } },
    update: { value: { fingerprint } },
  });

  // Update Canary
  const { encryptWithKey } = await import('@/lib/encryption');
  const canaryCipher = await encryptWithKey('OPS_SENTINAL_CRYPTO_CHECK', key);
  await prisma.systemConfig.upsert({
    where: { key: 'encryption_canary' },
    create: { key: 'encryption_canary', value: { encrypted: canaryCipher } },
    update: { value: { encrypted: canaryCipher } },
  });

  revalidatePath('/settings/system');
  return { success: true };
}

/**
 * Rotate System Encryption Key (Advanced)
 * Decrypts all data with old key and re-encrypts with new key.
 */
export async function rotateSystemEncryptionKey(
  prevState: { error?: string | null; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string | null; success?: boolean }> {
  try {
    await assertAdmin();

    const newKey = (formData.get('encryptionKey') as string | null)?.trim() ?? '';
    const confirm = formData.get('confirm') === 'on';

    if (!newKey || !/^[0-9a-fA-F]{64}$/.test(newKey)) {
      return { error: 'Invalid new key format.' };
    }
    if (!confirm) {
      return { error: 'Please confirm that you understand the risks.' };
    }

    const { getEncryptionKey, decryptWithKey, encryptWithKey, getFingerprint } =
      await import('@/lib/encryption');
    const oldKey = await getEncryptionKey();

    if (!oldKey) {
      // If no old key exists, just save the new one (bootstrap mode)
      // But we should use saveEncryptionKey for that.
      // Rotation implies shifting data.
      return { error: 'No existing key found to rotate from. Use standard save.' };
    }

    if (oldKey === newKey) {
      return { error: 'New key must be different from current key.' };
    }

    // 1. Fetch all encrypted data
    const oidcConfigs = await prisma.oidcConfig.findMany();
    const slackOAuths = await prisma.slackOAuthConfig.findMany();
    const slackIntegrations = await prisma.slackIntegration.findMany();

    // 2. Prepare updates (Fail Check first)
    const oidcUpdates: { id: string; clientSecret: string }[] = [];
    for (const config of oidcConfigs) {
      if (!config.clientSecret) continue;
      try {
        const plain = await decryptWithKey(config.clientSecret, oldKey);
        const reEncrypted = await encryptWithKey(plain, newKey);
        oidcUpdates.push({ id: config.id, clientSecret: reEncrypted });
      } catch (e) {
        return {
          error: `Rotation Aborted: Failed to decrypt OIDC Config (ID: ${config.id}). Data consistency check failed.`,
        };
      }
    }

    const slackOUpdates: { id: string; clientSecret: string }[] = [];
    for (const config of slackOAuths) {
      if (!config.clientSecret) continue;
      try {
        const plain = await decryptWithKey(config.clientSecret, oldKey);
        const reEncrypted = await encryptWithKey(plain, newKey);
        slackOUpdates.push({ id: config.id, clientSecret: reEncrypted });
      } catch (e) {
        return { error: `Rotation Aborted: Failed to decrypt Slack OAuth (ID: ${config.id}).` };
      }
    }

    const slackIntUpdates: { id: string; botToken: string; signingSecret: string | null }[] = [];
    for (const int of slackIntegrations) {
      try {
        const plainBot = await decryptWithKey(int.botToken, oldKey);
        const reBot = await encryptWithKey(plainBot, newKey);

        let reSign = null;
        if (int.signingSecret) {
          const plainSign = await decryptWithKey(int.signingSecret, oldKey);
          reSign = await encryptWithKey(plainSign, newKey);
        }
        slackIntUpdates.push({ id: int.id, botToken: reBot, signingSecret: reSign });
      } catch (e) {
        return {
          error: `Rotation Aborted: Failed to decrypt Slack Workspace (ID: ${int.workspaceId}).`,
        };
      }
    }

    // 3. Execute Transaction
    await prisma.$transaction(async tx => {
      // Update OIDC
      for (const up of oidcUpdates) {
        await tx.oidcConfig.update({
          where: { id: up.id },
          data: { clientSecret: up.clientSecret },
        });
      }
      // Update Slack OAuth
      for (const up of slackOUpdates) {
        await tx.slackOAuthConfig.update({
          where: { id: up.id },
          data: { clientSecret: up.clientSecret },
        });
      }
      // Update Slack Integrations
      for (const up of slackIntUpdates) {
        await tx.slackIntegration.update({
          where: { id: up.id },
          data: {
            botToken: up.botToken,
            ...(up.signingSecret ? { signingSecret: up.signingSecret } : {}),
          },
        });
      }

      // Update System Key and Fingerprint
      const fingerprint = getFingerprint(newKey);
      await tx.systemSettings.upsert({
        where: { id: 'default' },
        create: { encryptionKey: newKey },
        update: { encryptionKey: newKey },
      });

      // Update Fingerprint (using untyped `any` for value field since it's JSON)
      // Update Fingerprint
      await tx.systemConfig.upsert({
        where: { key: 'encryption_fingerprint' },
        create: { key: 'encryption_fingerprint', value: { fingerprint } },
        update: { value: { fingerprint } },
      });

      // Update Canary (Re-encrypt static plaintext with NEW key)
      const canaryCipher = await encryptWithKey('OPS_SENTINAL_CRYPTO_CHECK', newKey);
      await tx.systemConfig.upsert({
        where: { key: 'encryption_canary' },
        create: { key: 'encryption_canary', value: { encrypted: canaryCipher } },
        update: { value: { encrypted: canaryCipher } },
      });
    });

    const user = await getCurrentUser();
    await import('@/lib/audit').then(m =>
      m.logAudit({
        action: 'system.encryption_key.rotated',
        entityType: 'USER',
        entityId: user.id,
        actorId: user.id,
        details: { countOidc: oidcUpdates.length, countSlack: slackIntUpdates.length },
      })
    );

    revalidatePath('/settings/system');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Rotation failed.' };
  }
}

/**
 * Smart Router for Encryption Key Management
 * Handles: Bootstrap, Rotation, and Emergency Recovery
 */
export async function manageEncryptionKey(
  prevState: { error?: string | null; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string | null; success?: boolean }> {
  try {
    await assertAdmin();

    const { getEncryptionKey, validateCanary } = await import('@/lib/encryption');
    const existingKey = await getEncryptionKey(); // Returns null if invalid/canary-fail

    // Case 1: Recovery Mode (System Locked)
    // getEncryptionKey returns null if canary fails, BUT we need to check if a key actually EXISTS in DB to distinguish from Bootstrap.
    // We can check prisma directly or rely on the fact that if getEncryptionKey is null but DB has data...
    const dbSettings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    const hasRawKey = !!dbSettings?.encryptionKey;

    if (hasRawKey && !existingKey) {
      // Key exists but is invalid (Canary failed).
      // Action: Emergency Restore (Overwrite Key)
      return saveEncryptionKey(prevState, formData);
    }

    // Case 2: Bootstrap (First Time Setup)
    if (!hasRawKey) {
      return saveEncryptionKey(prevState, formData);
    }

    // Case 3: Rotation (Normal Operation)
    // Key exists and is valid. Use Rotation Logic.
    return rotateSystemEncryptionKey(prevState, formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Operation failed' };
  }
}
