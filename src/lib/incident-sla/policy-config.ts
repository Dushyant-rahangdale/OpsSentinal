import 'server-only';
import prisma from '@/lib/prisma';
import { assertCanModifyService, getUserPermissions } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { incidentSlaPolicyInputSchema } from './policy-validation';
import { emitAuditEvent } from '@/lib/audit';

/** Deliberately uncached: creation reads the current immutable version transactionally. */
export async function getIncidentSlaPolicy(scopeKey: string) {
  return prisma.incidentSlaPolicy.findFirst({
    where: { scopeKey },
    orderBy: { version: 'desc' },
    include: { rules: true },
  });
}

export async function saveIncidentSlaPolicy(rawInput: unknown) {
  const input = incidentSlaPolicyInputSchema.parse(rawInput);
  const permissions = await getUserPermissions();
  if (!permissions.authenticated) throw new Error('Unauthorized');
  const serviceId = input.scopeKey.startsWith('service:') ? input.scopeKey.slice(8) : null;
  if (serviceId) {
    await assertCanModifyService(serviceId);
  } else if (!permissions.capabilities.includes('admin.manage')) {
    throw new Error('Unauthorized. Admin access required.');
  }
  const result = await prisma.$transaction(async tx => {
    // Scope-specific xact lock serializes even first-version creation (no row exists yet).
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`incident-sla:${input.scopeKey}`}, 0))`;
    if (serviceId) {
      const exists = await tx.service.findUnique({
        where: { id: serviceId },
        select: { id: true },
      });
      if (!exists) throw new Error('Service not found');
    }
    const previous = await tx.incidentSlaPolicy.findFirst({
      where: { scopeKey: input.scopeKey },
      orderBy: { version: 'desc' },
    });
    if ((previous?.version ?? 0) !== input.expectedVersion)
      throw new Error('SLA policy changed. Reload settings before saving.');
    const policy = await tx.incidentSlaPolicy.create({
      data: {
        scopeKey: input.scopeKey,
        version: input.expectedVersion + 1,
        inheritWorkspace: input.inheritWorkspace,
        baseAckTargetMs: input.baseAckTargetMs,
        baseResolveTargetMs: input.baseResolveTargetMs,
        createdById: permissions.id,
        rules: { create: input.rules },
      },
      include: { rules: true },
    });
    await emitAuditEvent(
      {
        action: 'incident_sla.policy.version_created',
        source: 'UI',
        target: { type: serviceId ? 'SERVICE' : 'SYSTEM_CONFIG', id: serviceId ?? 'workspace' },
        actor: { type: 'USER', id: permissions.id },
        metadata: {
          policyId: policy.id,
          previousVersion: input.expectedVersion,
          ...input,
          futureIncidentsOnly: true,
        },
      },
      tx
    );
    return policy;
  });
  // No policy cache to invalidate. Refresh every settings/read route that presents configuration.
  for (const path of [
    '/settings/incident-sla',
    '/settings',
    '/services',
    '/audit',
    ...(serviceId ? [`/services/${serviceId}`, `/services/${serviceId}/settings`] : []),
  ])
    revalidatePath(path);
  return result;
}
