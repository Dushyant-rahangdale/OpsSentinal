import 'server-only';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { emitAuditEvent } from '@/lib/audit';
import { logger } from '@/lib/logger';
import {
  addOperationalMetric,
  observeOperationalHistogram,
} from '@/lib/metrics/operational/registry';
import { StatusPageAdminError } from '@/lib/status-pages/admin';
import {
  classifyStatusPageChange,
  type StatusPageChangeClassification,
  type StatusPageClassifierState,
} from '@/lib/status-pages/publication-policy';
import { getStatusPageServingStore } from '@/lib/status-pages/serving-store';
import { publishStatusPageSnapshot } from '@/lib/status-pages/snapshot';

/** What an administrator should be told about the public page after their save. */
export type StatusPagePublicationStatus = 'LIVE' | 'PUBLISHING' | 'FAILED' | 'DISABLED';

export type StatusPagePublicationState = {
  status: StatusPagePublicationStatus;
  /** The revision actually being served, as a string: BigInt cannot be JSON-serialized. */
  revision: string;
  lastError?: string | null;
  /** True while the previous projection is being served in place of a newer one. */
  stale?: boolean;
};

export type StatusPageConfigurationActor = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type StatusPageConfigurationChange = {
  pageId: string;
  actor: StatusPageConfigurationActor;
  /** Already normalized the way persistence stores it, so the classifier can diff it directly. */
  patch: Record<string, unknown>;
  serviceIds?: string[];
  serviceConfigs?: Record<
    string,
    { displayName?: string | null; order?: number; showOnPage?: boolean }
  >;
  expectedUpdatedAt?: string;
  /** Settings section that produced the patch, recorded for audit only. */
  section?: string;
  /**
   * Applied to the patch inside the transaction. Lets the caller keep ownership of side effects
   * that must commit atomically with the settings write, such as externalizing an uploaded logo.
   */
  transform?: (
    tx: Prisma.TransactionClient,
    patch: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
};

export type StatusPageConfigurationResult = {
  updatedAt: string;
  classification: StatusPageChangeClassification;
  publication: StatusPagePublicationState;
};

const SYNC_PUBLISH_BUDGET_MS = Number(process.env.STATUS_PAGE_SYNC_PUBLISH_BUDGET_MS ?? 5_000);
const MAX_LAST_ERROR_LENGTH = 500;

/**
 * Apply a settings change and republish the public page as one operation.
 *
 * The ordering is the entire point of this function:
 *
 *   1. classify, with no side effects, and do nothing at all if nothing changed
 *   2. withdraw the current projection *only* for a narrowed disclosure or a disable
 *   3. write config, mappings, audit and the serving decision in one transaction
 *   4. if a withdrawal happened but the write failed, put the page back
 *   5. publish, and only then switch routes
 *
 * Step 2 is what a branding save must never reach, and step 4 is what stops a lost optimistic
 * concurrency race from leaving the page dark with nothing changed.
 */
export async function applyStatusPageConfigurationChange(
  change: StatusPageConfigurationChange
): Promise<StatusPageConfigurationResult> {
  const { pageId, actor, patch, serviceIds, serviceConfigs, expectedUpdatedAt, section } = change;
  const startedAt = performance.now();

  const current = await prisma.statusPage.findUnique({ where: { id: pageId } });
  if (!current) {
    throw new StatusPageAdminError('STATUS_PAGE_NOT_FOUND', 'Status page not found.');
  }

  const serviceMappings =
    serviceIds === undefined
      ? undefined
      : await prisma.statusPageService.findMany({
          where: { statusPageId: pageId },
          select: { serviceId: true, showOnPage: true, displayName: true, order: true },
        });

  const classification = classifyStatusPageChange({
    current: { ...(current as unknown as StatusPageClassifierState), serviceMappings },
    patch,
    serviceIds,
    serviceConfigs,
  });

  // A save that changes nothing must not disturb a working page.
  if (classification.classes.length === 0) {
    return {
      updatedAt: current.updatedAt.toISOString(),
      classification,
      publication: await readStatusPagePublicationState(pageId),
    };
  }

  const store = getStatusPageServingStore();
  let preRevoked = false;
  if (classification.failClosed && classification.revocationReason) {
    // Before the write, so no reader can see the narrowed configuration's data through the
    // projection it is replacing.
    await store.revoke(pageId, classification.revocationReason);
    preRevoked = true;
  }

  let updatedAt: string;
  try {
    updatedAt = await prisma.$transaction(async tx => {
      const data = change.transform ? await change.transform(tx, { ...patch }) : patch;

      const saved = await tx.statusPage.update({
        where: {
          id: pageId,
          updatedAt: expectedUpdatedAt ? new Date(expectedUpdatedAt) : current.updatedAt,
        },
        data: data as Prisma.StatusPageUpdateInput,
      });

      if (serviceIds !== undefined) {
        await tx.statusPageService.deleteMany({ where: { statusPageId: pageId } });
        if (serviceIds.length > 0) {
          await tx.statusPageService.createMany({
            data: serviceIds.map(serviceId => {
              const config = Reflect.get(serviceConfigs ?? {}, serviceId) || {};
              return {
                statusPageId: pageId,
                serviceId,
                displayName: config.displayName || null,
                order: config.order || 0,
                showOnPage: config.showOnPage !== false,
              };
            }),
          });
        }
      }

      await emitAuditEvent(
        {
          action: 'status_page.config.updated',
          source: 'UI',
          target: { type: 'STATUS_PAGE', id: pageId },
          actor: { type: 'USER', id: actor.id, email: actor.email, name: actor.name },
          oldValue: { updatedAt: current.updatedAt.toISOString() },
          newValue: { updatedAt: saved.updatedAt.toISOString() },
          metadata: {
            changedFields: classification.changedFields,
            changeClasses: classification.classes,
            dominantClass: classification.dominant,
            failClosed: classification.failClosed,
            section: section ?? null,
            serviceMappingsChanged: serviceIds !== undefined,
            expectedUpdatedAt: expectedUpdatedAt || current.updatedAt.toISOString(),
          },
        },
        tx
      );

      // Last statement on purpose. The row triggers fired by the writes above bump
      // StatusPageSnapshot.revision, and nothing triggers on StatusPageSnapshot itself, so
      // recording the decision here makes it commit atomically with the change it describes.
      await tx.$executeRaw`
        UPDATE "StatusPageSnapshot"
           SET "servingState" = ${servingStateFor(classification)}, "lastError" = NULL
         WHERE "statusPageId" = ${pageId}
      `;

      return saved.updatedAt.toISOString();
    });
  } catch (error) {
    if (preRevoked) {
      // Nothing was committed, so republishing restores exactly the previous content. Failing to
      // do so is not fatal because the background projector is the backstop, but leaving a page
      // dark after a save that changed nothing is the worse outcome.
      try {
        await publishStatusPageSnapshot(pageId, { lockAttempts: 3, budgetMs: SYNC_PUBLISH_BUDGET_MS });
      } catch (compensationError) {
        logger.error('status.publication.compensation_failed', { pageId, error: compensationError });
      }
    }
    throw error;
  }

  const publication = await publishStatusPageConfiguration({ pageId, classification });
  observeOperationalHistogram(
    'opsknight_status_page_publication_duration_seconds',
    (performance.now() - startedAt) / 1_000,
    { change_class: classification.dominant, outcome: publication.status }
  );
  addOperationalMetric('opsknight_status_page_publication_total', 1, {
    change_class: classification.dominant,
    outcome: publication.status,
  });

  return { updatedAt, classification, publication };
}

function servingStateFor(classification: StatusPageChangeClassification) {
  if (classification.dominant === 'DISABLE') return 'DISABLED';
  if (classification.failClosed) return 'FAIL_CLOSED';
  return 'STALE_OK';
}

/**
 * Publish a page and switch its routes. Must be called after the configuration has committed:
 * it opens its own transaction, so invoking it inside another one would have that transaction
 * waiting on row locks it is itself holding, on a second pooled connection.
 */
export async function publishStatusPageConfiguration(input: {
  pageId: string;
  classification: StatusPageChangeClassification;
  budgetMs?: number;
}): Promise<StatusPagePublicationState> {
  const { pageId, classification } = input;
  const outcome = await publishStatusPageSnapshot(pageId, {
    lockAttempts: 3,
    lockRetryDelayMs: 50,
    budgetMs: input.budgetMs ?? SYNC_PUBLISH_BUDGET_MS,
  });

  if (outcome.kind === 'failed') {
    await recordPublicationError(pageId, outcome.error);
    return readStatusPagePublicationState(pageId);
  }

  // Contention and a lost revision race both mean another builder is already on it. Reporting
  // them as failures would make every save that races the projector look broken.
  if (outcome.kind === 'contended' || outcome.kind === 'superseded') {
    return readStatusPagePublicationState(pageId);
  }

  if (classification.classes.includes('ROUTING')) {
    const switched = await switchRoutes(pageId, classification);
    if (!switched) return readStatusPagePublicationState(pageId);
  }

  return readStatusPagePublicationState(pageId);
}

/**
 * Publish new route keys, prove they resolve, and only then drop the old ones.
 *
 * If verification fails nothing is removed: both the old and the new address staying live is a
 * far better failure than a page with no reachable address.
 */
async function switchRoutes(
  pageId: string,
  classification: StatusPageChangeClassification
): Promise<boolean> {
  const store = getStatusPageServingStore();
  for (const routeKey of classification.routes.added) {
    const resolved = await store.resolveRoute(routeKey);
    if (resolved?.pageId !== pageId) {
      await recordPublicationError(
        pageId,
        new Error(`Route ${routeKey} did not resolve to this status page after publishing`)
      );
      addOperationalMetric('opsknight_status_page_route_switches_total', 1, {
        outcome: 'verify_failed',
      });
      return false;
    }
  }
  for (const routeKey of classification.routes.removed) {
    await store.removeRoute(routeKey, pageId);
  }
  addOperationalMetric('opsknight_status_page_route_switches_total', 1, { outcome: 'switched' });
  return true;
}

async function recordPublicationError(pageId: string, error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).slice(
    0,
    MAX_LAST_ERROR_LENGTH
  );
  logger.error('status.publication.failed', { pageId, error });
  await prisma.$executeRaw`
    UPDATE "StatusPageSnapshot" SET "lastError" = ${message} WHERE "statusPageId" = ${pageId}
  `;
}

/**
 * Republish after a failure, without ever loosening a fail-closed decision.
 *
 * Clearing the marker here would let a privacy tightening whose publish failed be "retried" into
 * serving the very content it was meant to retract.
 */
export async function retryStatusPagePublication(
  pageId: string,
  actor: StatusPageConfigurationActor
): Promise<StatusPagePublicationState> {
  const page = await prisma.statusPage.findUnique({
    where: { id: pageId },
    select: { id: true, enabled: true },
  });
  if (!page) {
    throw new StatusPageAdminError('STATUS_PAGE_NOT_FOUND', 'Status page not found.');
  }

  await prisma.$executeRaw`
    UPDATE "StatusPageSnapshot"
       SET "lastError" = NULL,
           "servingState" = CASE WHEN ${page.enabled} THEN "servingState" ELSE 'DISABLED' END
     WHERE "statusPageId" = ${pageId}
  `;

  const outcome = await publishStatusPageSnapshot(pageId, {
    lockAttempts: 5,
    lockRetryDelayMs: 100,
    budgetMs: Math.max(SYNC_PUBLISH_BUDGET_MS, 15_000),
  });
  if (outcome.kind === 'failed') await recordPublicationError(pageId, outcome.error);

  await emitAuditEvent({
    action: 'status_page.publication.retried',
    source: 'UI',
    target: { type: 'STATUS_PAGE', id: pageId },
    actor: { type: 'USER', id: actor.id, email: actor.email, name: actor.name },
    metadata: { outcome: outcome.kind },
  });

  return readStatusPagePublicationState(pageId);
}

/** Derive what to tell the administrator from the control row and the page's enabled flag. */
export async function readStatusPagePublicationState(
  pageId: string
): Promise<StatusPagePublicationState> {
  const rows = await prisma.$queryRaw<
    Array<{
      revision: bigint;
      publishedRevision: bigint;
      servingState: string;
      lastError: string | null;
      hasPayload: boolean;
      enabled: boolean;
    }>
  >`
    SELECT s."revision", s."publishedRevision", s."servingState", s."lastError",
           (s."payload" IS NOT NULL) AS "hasPayload", p."enabled"
      FROM "StatusPageSnapshot" s
      JOIN "StatusPage" p ON p."id" = s."statusPageId"
     WHERE s."statusPageId" = ${pageId}
  `;
  const row = rows[0];
  if (!row) return { status: 'PUBLISHING', revision: '-1' };

  const revision = row.publishedRevision.toString();
  const stale = row.servingState === 'STALE_OK';
  if (!row.enabled || row.servingState === 'DISABLED') {
    return { status: 'DISABLED', revision, lastError: row.lastError };
  }
  if (row.lastError) return { status: 'FAILED', revision, lastError: row.lastError, stale };
  if (row.publishedRevision === row.revision && row.hasPayload && row.servingState === 'LIVE') {
    return { status: 'LIVE', revision };
  }
  return { status: 'PUBLISHING', revision, stale };
}
