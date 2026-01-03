'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { assertAdmin, getCurrentUser } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { encrypt } from '@/lib/encryption';

export async function saveSlackOAuthConfig(
  formData: FormData
): Promise<{ error?: string } | undefined> {
  try {
    await assertAdmin();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.',
    };
  }

  const clientId = formData.get('clientId') as string;
  const clientSecret = formData.get('clientSecret') as string;
  const redirectUri = formData.get('redirectUri') as string;
  const enabledValue = formData.get('enabled');
  const enabled = enabledValue === 'on' || enabledValue === 'true';

  if (!clientId) {
    return { error: 'Client ID is required' };
  }

  // Fingerprint Check
  const { validateEncryptionFingerprint } = await import('@/lib/encryption');
  const isKeyValid = await validateEncryptionFingerprint();
  if (!isKeyValid) {
    return { error: 'CRITICAL: Encryption Key mismatch. Writes blocked.' };
  }

  // Get existing config to preserve secret if not provided
  const existing = await prisma.slackOAuthConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  // If updating and secret is not provided (or is placeholder), keep existing
  let encryptedSecret = existing?.clientSecret;
  if (clientSecret && clientSecret !== '********' && clientSecret.trim() !== '') {
    encryptedSecret = await encrypt(clientSecret);
  } else if (!existing) {
    return { error: 'Client Secret is required for new configuration' };
  }

  const user = await getCurrentUser();
  const actorId = user.id;

  // Upsert config (only one config record)
  await prisma.slackOAuthConfig.upsert({
    where: { id: existing?.id || 'default' },
    create: {
      id: 'default',
      clientId,
      clientSecret: encryptedSecret!,
      redirectUri: redirectUri || null,
      enabled,
      updatedBy: actorId,
    },
    update: {
      clientId,
      ...(encryptedSecret ? { clientSecret: encryptedSecret } : {}),
      redirectUri: redirectUri || null,
      enabled,
      updatedBy: actorId,
    },
  });

  await logAudit({
    action: 'slack.oauth.config.updated',
    entityType: 'USER',
    entityId: user.id,
    actorId,
    details: { enabled, clientId: clientId.substring(0, 10) + '...', configType: 'slack-oauth' },
  });

  revalidatePath('/settings/integrations/slack');
  revalidatePath('/services');

  return undefined; // Success
}
