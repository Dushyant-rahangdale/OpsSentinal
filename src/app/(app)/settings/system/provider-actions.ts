'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { assertAdmin, getCurrentUser } from '@/lib/rbac';
import {
  decryptProviderConfig,
  encryptProviderConfig,
  mergeSensitiveProviderFields,
} from '@/lib/encrypted-provider-config';

const SUPPORTED_PROVIDERS = new Set([
  'twilio',
  'aws-sns',
  'resend',
  'sendgrid',
  'smtp',
  'ses',
  'web-push',
]);

export class SettingsChangedError extends Error {
  readonly code = 'SETTINGS_CHANGED';

  constructor() {
    super('Settings changed elsewhere. Reload before saving.');
    this.name = 'SettingsChangedError';
  }
}

function parseExpectedUpdatedAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid settings revision. Reload the page and try again.');
  }
  return parsed;
}

/**
 * Atomic notification-provider mutation contract.
 *
 * Existing records require the revision returned by getNotificationProviders().
 * The conditional update prevents a stale administrator from silently replacing
 * a newer provider configuration. Mutation and audit are committed together.
 */
export async function updateNotificationProvider(
  providerId: string | null,
  provider: string,
  enabled: boolean,
  config: Record<string, unknown>,
  expectedUpdatedAt?: string | null
): Promise<{ success: true; updatedAt: string }> {
  await assertAdmin();

  const normalizedProvider = provider.trim().toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(normalizedProvider)) {
    throw new Error(`Unsupported notification provider '${provider}'.`);
  }

  const user = await getCurrentUser();
  const existingProvider = providerId
    ? await prisma.notificationProvider.findUnique({ where: { id: providerId } })
    : await prisma.notificationProvider.findUnique({ where: { provider: normalizedProvider } });

  if (providerId && !existingProvider) {
    throw new SettingsChangedError();
  }

  const expectedRevision = parseExpectedUpdatedAt(expectedUpdatedAt);
  if (existingProvider && !expectedRevision) {
    throw new Error('Settings revision is required. Reload the page and try again.');
  }
  if (!existingProvider && expectedRevision) {
    throw new SettingsChangedError();
  }

  const existingConfig = existingProvider?.config
    ? await decryptProviderConfig(
        normalizedProvider,
        existingProvider.config as Record<string, unknown>
      )
    : {};
  const mergedConfig = mergeSensitiveProviderFields(normalizedProvider, config, existingConfig);
  const encryptedConfig = await encryptProviderConfig(normalizedProvider, mergedConfig);

  const providerRecordId = await prisma.$transaction(async tx => {
    let id: string;

    if (existingProvider) {
      const updateResult = await tx.notificationProvider.updateMany({
        where: {
          id: existingProvider.id,
          updatedAt: expectedRevision!,
        },
        data: {
          enabled,
          config: encryptedConfig as Prisma.InputJsonValue,
          updatedBy: user.id,
        },
      });

      if (updateResult.count !== 1) {
        throw new SettingsChangedError();
      }
      id = existingProvider.id;
    } else {
      const created = await tx.notificationProvider.create({
        data: {
          provider: normalizedProvider,
          enabled,
          config: encryptedConfig as Prisma.InputJsonValue,
          updatedBy: user.id,
        },
        select: { id: true },
      });
      id = created.id;
    }

    await logAudit(
      {
        action: 'notification_provider.updated',
        entityType: 'SYSTEM_CONFIG',
        entityId: id,
        actorId: user.id,
        oldValue: existingProvider
          ? { provider: normalizedProvider, enabled: existingProvider.enabled }
          : null,
        newValue: { provider: normalizedProvider, enabled },
        details: { provider: normalizedProvider },
      },
      tx
    );

    return id;
  });

  const committed = await prisma.notificationProvider.findUniqueOrThrow({
    where: { id: providerRecordId },
    select: { updatedAt: true },
  });

  revalidatePath('/settings/system');
  revalidatePath('/settings/notifications');

  return { success: true, updatedAt: committed.updatedAt.toISOString() };
}
