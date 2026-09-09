import 'server-only';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { emitAuditEvent } from '@/lib/audit';
import { IncidentResponsePolicyError } from '@/lib/incident-sla/policy-config';

const classificationPolicyInput = z
  .object({
    expectedVersion: z.number().int().min(0).max(2_147_483_646),
    derivePriorityFromUrgency: z.boolean(),
    rules: z
      .array(
        z
          .object({
            matchValue: z.enum(['critical', 'error', 'warning', 'info']),
            priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).nullable(),
            urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
          })
          .strict()
      )
      .length(4),
  })
  .strict()
  .refine(input => new Set(input.rules.map(rule => rule.matchValue)).size === 4, {
    message: 'Each alert severity must have exactly one mapping.',
  });

export async function saveWorkspaceClassificationPolicy(rawInput: unknown) {
  const input = classificationPolicyInput.parse(rawInput);
  const permissions = await getUserPermissions();
  if (!permissions.authenticated || !permissions.capabilities.includes('admin.manage')) {
    throw new IncidentResponsePolicyError('UNAUTHORIZED');
  }

  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('incident-classification:workspace', 0))`;
    const previous = await tx.incidentClassificationPolicy.findFirst({
      where: { scopeKey: 'workspace', sealedAt: { not: null } },
      orderBy: { version: 'desc' },
    });
    if ((previous?.version ?? 0) !== input.expectedVersion) {
      throw new IncidentResponsePolicyError('CONFLICT');
    }
    const policy = await tx.incidentClassificationPolicy.create({
      data: {
        scopeKey: 'workspace',
        version: input.expectedVersion + 1,
        inheritWorkspace: false,
        derivePriorityFromUrgency: input.derivePriorityFromUrgency,
        createdById: permissions.id,
        rules: {
          create: input.rules.map(rule => ({
            matchType: 'ALERT_SEVERITY',
            ...rule,
            label: `${rule.matchValue} alert`,
          })),
        },
      },
      include: { rules: true },
    });
    const sealed = await tx.incidentClassificationPolicy.update({
      where: { id: policy.id },
      data: { sealedAt: new Date() },
      include: { rules: true },
    });
    await emitAuditEvent(
      {
        action: 'incident_classification.policy.version_created',
        source: 'UI',
        target: { type: 'SYSTEM_CONFIG', id: 'workspace' },
        actor: { type: 'USER', id: permissions.id },
        metadata: {
          previousPolicyId: previous?.id ?? null,
          newPolicyId: sealed.id,
          version: sealed.version,
          derivePriorityFromUrgency: sealed.derivePriorityFromUrgency,
          rules: sealed.rules,
          futureIncidentsOnly: true,
        },
      },
      tx
    );
    return sealed;
  });

  for (const path of ['/settings/incident-sla', '/settings', '/audit']) revalidatePath(path);
  return result;
}
