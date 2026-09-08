'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { logAudit } from '@/lib/audit';
import { assertAdmin } from '@/lib/rbac';
import { normalizeJiraBaseUrl } from '@/lib/jira-validation';
import { revalidatePath } from 'next/cache';

type JiraConfigState = {
  success?: boolean;
  error?: string | null;
};

const JiraConfigSchema = z.object({
  baseUrl: z.string().trim().min(1, 'Jira site URL is required.'),
  userEmail: z.string().trim().email('A valid Jira user email is required.'),
  apiToken: z.string(),
  webhookSecret: z.string(),
  enabled: z.boolean(),
});

export async function saveJiraConfig(
  _prevState: JiraConfigState | undefined,
  formData: FormData
): Promise<JiraConfigState> {
  let actor;
  try {
    actor = await assertAdmin();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.',
    };
  }

  try {
    const parsed = JiraConfigSchema.safeParse({
      baseUrl: (formData.get('baseUrl') as string | null) ?? '',
      userEmail: (formData.get('userEmail') as string | null) ?? '',
      apiToken: ((formData.get('apiToken') as string | null) ?? '').trim(),
      webhookSecret: ((formData.get('webhookSecret') as string | null) ?? '').trim(),
      enabled: ['on', 'true'].includes(String(formData.get('enabled') ?? '')),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid Jira configuration.' };
    }

    const baseUrl = normalizeJiraBaseUrl(parsed.data.baseUrl);
    const userEmail = parsed.data.userEmail.trim().toLowerCase();
    const { apiToken, webhookSecret, enabled } = parsed.data;

    const existing = await prisma.jiraConfig.findUnique({ where: { id: 'default' } });
    if (!existing && !apiToken) {
      return { error: 'Jira API token is required for new configuration.' };
    }

    const apiTokenEncrypted =
      apiToken && apiToken !== '********' ? await encrypt(apiToken) : existing?.apiTokenEncrypted;
    const webhookSecretEncrypted =
      webhookSecret && webhookSecret !== '********'
        ? await encrypt(webhookSecret)
        : existing?.webhookSecretEncrypted;

    if (!apiTokenEncrypted) {
      return { error: 'Jira API token is required.' };
    }

    await prisma.$transaction(async tx => {
      await tx.jiraConfig.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          baseUrl,
          userEmail,
          apiTokenEncrypted,
          enabled,
          defaultProjectKey: null,
          webhookSecretEncrypted,
          updatedBy: actor.id,
        },
        update: {
          baseUrl,
          userEmail,
          apiTokenEncrypted,
          enabled,
          defaultProjectKey: null,
          webhookSecretEncrypted,
          updatedBy: actor.id,
        },
      });

      await logAudit(
        {
          action: 'jira.config.updated',
          entityType: 'USER',
          entityId: actor.id,
          actorId: actor.id,
          oldValue: existing
            ? {
                enabled: existing.enabled,
                baseUrl: existing.baseUrl,
                userEmail: existing.userEmail,
                hasWebhookSecret: Boolean(existing.webhookSecretEncrypted),
              }
            : null,
          newValue: {
            enabled,
            baseUrl,
            userEmail,
            hasWebhookSecret: Boolean(webhookSecretEncrypted),
          },
          details: { integration: 'jira' },
        },
        tx
      );
    });

    revalidatePath('/settings');
    revalidatePath('/settings/integrations/jira');

    return { success: true, error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to save Jira configuration.' };
  }
}
