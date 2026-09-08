'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { assertAdmin } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';

const ChatOpsConfigSchema = z
  .object({
    enabled: z.boolean(),
    channelPrefix: z.string().trim().min(1).max(20),
    autoCreateOnUrgency: z.array(z.enum(['HIGH', 'MEDIUM', 'LOW'])).max(3),
    autoCreateOnPriority: z.array(z.enum(['P1', 'P2', 'P3', 'P4', 'P5'])).max(5),
    archiveOnResolve: z.boolean(),
    defaultVideoBridge: z.enum(['JITSI', 'ZOOM', 'GOOGLE_MEET', 'NONE']),
    customBridgeUrlTemplate: z.string().trim().max(2048),
  })
  .superRefine((value, ctx) => {
    if (!value.customBridgeUrlTemplate || value.defaultVideoBridge === 'NONE') return;
    const probe = value.customBridgeUrlTemplate.replaceAll('{incidentId}', 'incident-id');
    try {
      const url = new URL(probe);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customBridgeUrlTemplate'],
        message: 'Custom bridge URL must be a valid HTTP(S) URL template.',
      });
    }
  });

type ChatOpsConfigState = {
  success?: boolean;
  error?: string | null;
};

export async function saveChatOpsConfig(
  _prevState: ChatOpsConfigState | undefined,
  formData: FormData
): Promise<ChatOpsConfigState> {
  let actor;
  try {
    actor = await assertAdmin();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.',
    };
  }

  try {
    const channelPrefix = ((formData.get('channelPrefix') as string | null) ?? 'inc')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20);

    const parsed = ChatOpsConfigSchema.safeParse({
      enabled: ['on', 'true'].includes(String(formData.get('enabled') ?? '')),
      channelPrefix,
      autoCreateOnUrgency: formData.getAll('autoCreateOnUrgency'),
      autoCreateOnPriority: formData.getAll('autoCreateOnPriority'),
      archiveOnResolve: ['on', 'true'].includes(String(formData.get('archiveOnResolve') ?? '')),
      defaultVideoBridge: (formData.get('defaultVideoBridge') as string | null) ?? 'NONE',
      customBridgeUrlTemplate:
        ((formData.get('customBridgeUrlTemplate') as string | null) ?? '').trim(),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid ChatOps configuration.' };
    }

    const next = parsed.data;
    const existing = await prisma.chatOpsConfig.findUnique({ where: { id: 'default' } });

    await prisma.$transaction(async tx => {
      await tx.chatOpsConfig.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          ...next,
          customBridgeUrlTemplate: next.customBridgeUrlTemplate || null,
        },
        update: {
          ...next,
          customBridgeUrlTemplate: next.customBridgeUrlTemplate || null,
        },
      });

      await logAudit(
        {
          action: 'chatops.config.updated',
          entityType: 'SERVICE',
          entityId: 'chatops-config',
          actorId: actor.id,
          oldValue: existing
            ? {
                enabled: existing.enabled,
                channelPrefix: existing.channelPrefix,
                autoCreateOnUrgency: existing.autoCreateOnUrgency,
                autoCreateOnPriority: existing.autoCreateOnPriority,
                archiveOnResolve: existing.archiveOnResolve,
                defaultVideoBridge: existing.defaultVideoBridge,
                customBridgeUrlTemplate: existing.customBridgeUrlTemplate,
              }
            : null,
          newValue: {
            enabled: next.enabled,
            channelPrefix: next.channelPrefix,
            autoCreateOnUrgency: next.autoCreateOnUrgency,
            autoCreateOnPriority: next.autoCreateOnPriority,
            archiveOnResolve: next.archiveOnResolve,
            defaultVideoBridge: next.defaultVideoBridge,
            customBridgeUrlTemplate: next.customBridgeUrlTemplate || null,
          },
        },
        tx
      );
    });

    revalidatePath('/settings');
    revalidatePath('/settings/integrations/chatops');

    return { success: true, error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to save ChatOps configuration.',
    };
  }
}
