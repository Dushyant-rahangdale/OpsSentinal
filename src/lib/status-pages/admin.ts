import 'server-only';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { emitAuditEvent } from '@/lib/audit';
import { getStatusPageServingStore } from './serving-store';
import { rebuildStatusPageSnapshot } from './snapshot';

const STATUS_PAGE_LIFECYCLE_LOCK = 'opsknight:status-pages:lifecycle:v1';

export class StatusPageAdminError extends Error {
  constructor(
    readonly code:
      | 'STATUS_PAGE_NOT_FOUND'
      | 'STATUS_PAGE_DEFAULT_REPLACEMENT_REQUIRED'
      | 'STATUS_PAGE_DEFAULT_REPLACEMENT_INVALID',
    message: string
  ) {
    super(message);
    this.name = 'StatusPageAdminError';
  }
}

async function lockLifecycle(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${STATUS_PAGE_LIFECYCLE_LOCK}, 0))`;
}

export async function requireStatusPageForAdmin(
  statusPageId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const page = await tx.statusPage.findUnique({ where: { id: statusPageId } });
  if (!page) throw new StatusPageAdminError('STATUS_PAGE_NOT_FOUND', 'Status page not found.');
  return page;
}

export async function createStatusPage(input: {
  name: string;
  slug: string;
  makeDefault?: boolean;
}) {
  return prisma.$transaction(async tx => {
    await lockLifecycle(tx);
    const count = await tx.statusPage.count();
    const isDefault = count === 0 || input.makeDefault === true;
    if (isDefault) {
      await tx.statusPage.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    return tx.statusPage.create({
      data: { name: input.name, slug: input.slug, enabled: false, isDefault },
    });
  });
}

export async function makeDefaultStatusPage(statusPageId: string) {
  return prisma.$transaction(async tx => {
    await lockLifecycle(tx);
    await requireStatusPageForAdmin(statusPageId, tx);
    await tx.statusPage.updateMany({
      where: { isDefault: true, id: { not: statusPageId } },
      data: { isDefault: false },
    });
    return tx.statusPage.update({ where: { id: statusPageId }, data: { isDefault: true } });
  });
}

export async function deleteStatusPage(statusPageId: string, replacementDefaultId?: string) {
  const { page, replacementId } = await prisma.$transaction(async tx => {
    await lockLifecycle(tx);
    const page = await requireStatusPageForAdmin(statusPageId, tx);
    const count = await tx.statusPage.count();

    if (page.isDefault && count > 1) {
      if (!replacementDefaultId) {
        throw new StatusPageAdminError(
          'STATUS_PAGE_DEFAULT_REPLACEMENT_REQUIRED',
          'Choose a replacement default status page before deleting this page.'
        );
      }
      if (replacementDefaultId === statusPageId) {
        throw new StatusPageAdminError(
          'STATUS_PAGE_DEFAULT_REPLACEMENT_INVALID',
          'The replacement default must be a different status page.'
        );
      }
      const replacement = await requireStatusPageForAdmin(replacementDefaultId, tx);
      if (!replacement.enabled) {
        throw new StatusPageAdminError(
          'STATUS_PAGE_DEFAULT_REPLACEMENT_INVALID',
          'The replacement default status page must be public.'
        );
      }
      await tx.statusPage.update({ where: { id: statusPageId }, data: { isDefault: false } });
      await tx.statusPage.update({
        where: { id: replacementDefaultId },
        data: { isDefault: true },
      });
    }

    return {
      page,
      replacementId: page.isDefault && count > 1 ? replacementDefaultId : undefined,
    };
  });
  const store = getStatusPageServingStore();
  // Publish the replacement and switch the default route before revoking the
  // old page. This keeps /status continuously available during replacement.
  if (replacementId) {
    try {
      if (!(await rebuildStatusPageSnapshot(replacementId))) {
        throw new Error('Failed to publish the replacement default status page.');
      }
    } catch (error) {
      // Keep the operation retryable if publication fails. The old route still
      // points to a healthy page because revocation has not started yet.
      await prisma.$transaction(async tx => {
        await lockLifecycle(tx);
        await tx.statusPage.updateMany({
          where: { id: replacementId },
          data: { isDefault: false },
        });
        await tx.statusPage.updateMany({
          where: { id: statusPageId },
          data: { isDefault: true },
        });
      });
      throw error;
    }
  }
  await store.revoke(statusPageId);
  await Promise.all([
    ...(page.slug ? [store.removeRoute(page.slug)] : []),
    ...(page.customDomain ? [store.removeRoute(`domain:${page.customDomain.toLowerCase()}`)] : []),
    ...(page.subdomain ? [store.removeRoute(`subdomain:${page.subdomain.toLowerCase()}`)] : []),
    ...(page.isDefault && !replacementId ? [store.removeRoute('default')] : []),
  ]);
  await prisma.$transaction(async tx => {
    await lockLifecycle(tx);
    await tx.statusPage.update({ where: { id: statusPageId }, data: { enabled: false } });
    await tx.$executeRaw`UPDATE "StatusPageSnapshot" SET "revision" = "revision" + 1 WHERE "statusPageId" = ${statusPageId}`;
    await tx.notification.updateMany({
      where: {
        tenantKey: `status-page:${statusPageId}`,
        status: { in: ['PENDING', 'FAILED'] },
      },
      data: { status: 'SKIPPED', errorMsg: 'Status page deleted' },
    });
    await tx.statusPage.delete({ where: { id: statusPageId } });
    await emitAuditEvent({
      action: 'STATUS_PAGE_DELETED',
      source: 'UI',
      target: { type: 'STATUS_PAGE', id: statusPageId },
    }, tx);
  });
}
