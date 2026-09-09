import 'server-only';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { statusPagePublicationLimits } from './publication-policy';
import {
  publicStatusVisibility,
  serializePublicStatusIncident,
} from '@/lib/status-page-public-data';
import { activeIncidentStatuses } from '@/lib/incident-status';
import { getReportingWindowForDays } from '@/lib/retention-policy';
import { projectServiceStatus, visibleMaintenanceServiceIds } from '@/lib/status-page-projection';
import { calculateMultiServiceUptime } from '@/lib/sla-server';
import { addOperationalMetric, setOperationalGauge } from '@/lib/metrics/operational/registry';
import {
  getStatusPageServingStore,
  manifestServingState,
  statusSnapshotIntegrity,
  type StatusServingRoute,
} from './serving-store';
import type { PublicStatusPageSnapshot } from './public-contract';
import { aggregatePublicRegions, buildPublicHistorySegments } from './history';
import {
  getWorstPublicStatus,
  normalizePublicStatus,
  publicStatusForIncidentUrgency,
} from './status-presentation';
import { parsePublicStatusPageSnapshot } from './public-contract-schema';
import { loadHistoryIncidentsByService, type HistoryIncident } from './history-query';

export type StatusPageSnapshot = PublicStatusPageSnapshot;

function parseStatusPageSnapshot(
  pageId: string,
  payload: Prisma.JsonValue | null | undefined
): StatusPageSnapshot | null {
  return parsePublicStatusPageSnapshot(pageId, payload);
}

/** All public data is explicitly projected; no Prisma records are spread into the payload. */
export async function buildStatusPageSnapshot(
  pageId: string,
  revision: string
): Promise<StatusPageSnapshot | null> {
  const page = await prisma.statusPage.findUnique({
    where: { id: pageId },
    include: {
      services: {
        where: { showOnPage: true },
        orderBy: { order: 'asc' },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              region: true,
              slaTier: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
      },
      announcements: { where: { isActive: true }, orderBy: { startDate: 'desc' }, take: 200 },
    },
  });
  if (!page?.enabled) return null;

  const now = new Date();
  const limits = statusPagePublicationLimits(page);
  const visibility = publicStatusVisibility(page);
  const ids = page.services.map(mapping => mapping.serviceId);
  const [window, window30, window90] = await Promise.all([
    getReportingWindowForDays(limits.historyDays, 'incident', now),
    getReportingWindowForDays(30, 'incident', now),
    getReportingWindowForDays(90, 'incident', now),
  ]);
  const earliestRequiredStart = new Date(Math.min(window.start.getTime(), window90.start.getTime()));
  const [groups, incidents, uptime90, uptime30, historyIncidentsByService, historyMaintenance] = ids.length
    ? await Promise.all([
        prisma.incident.groupBy({
          by: ['serviceId', 'urgency'],
          where: {
            serviceId: { in: ids },
            visibility: 'PUBLIC',
            status: { in: activeIncidentStatuses() },
          },
          _count: { _all: true },
        }),
        visibility.showIncidents
          ? prisma.incident.findMany({
              where: {
                serviceId: { in: ids },
                visibility: 'PUBLIC',
                createdAt: { gte: window.start, lte: now },
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: limits.maxIncidents,
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                urgency: true,
                createdAt: true,
                acknowledgedAt: true,
                resolvedAt: true,
                service: { select: { id: true, name: true, region: true } },
                events: {
                  orderBy: { createdAt: 'asc' },
                  take: 50,
                  select: { id: true, type: true, message: true, createdAt: true },
                },
                postmortem: { select: { status: true, isPublic: true } },
              },
            })
          : [],
        visibility.showUptime ? calculateMultiServiceUptime(ids, window90.start, now, 'PUBLIC') : {},
        visibility.showUptime
          ? calculateMultiServiceUptime(ids, window30.start, now, 'PUBLIC')
          : {},
        visibility.showUptime
          ? loadHistoryIncidentsByService(ids, earliestRequiredStart, now)
          : new Map<string, HistoryIncident[]>(),
        visibility.showUptime ? prisma.statusPageAnnouncement.findMany({
          where: {
            statusPageId: pageId, type: 'MAINTENANCE', startDate: { lte: now },
            OR: [{ endDate: { gte: earliestRequiredStart } }, { endDate: null }],
          },
          select: { startDate: true, endDate: true, affectedServiceIds: true },
        }) : [],
      ])
    : [[], [], {}, {}, new Map<string, HistoryIncident[]>(), []];

  const impactByService = new Map<string, { active: number; statuses: PublicStatusPageSnapshot['status'][] }>();
  for (const group of groups) {
    const current = impactByService.get(group.serviceId) || { active: 0, statuses: [] };
    current.active += group._count._all;
    current.statuses.push(publicStatusForIncidentUrgency(group.urgency));
    impactByService.set(group.serviceId, current);
  }

  const maintenance = visibleMaintenanceServiceIds(page.announcements, ids, now);
  const measuredDays30 = (now.getTime() - window30.start.getTime()) / 86_400_000;
  const measuredDays90 = (now.getTime() - window90.start.getTime()) / 86_400_000;
  const maintenanceHistory = historyMaintenance.map(item => ({
    startDate: item.startDate,
    endDate: item.endDate,
    affectedServiceIds: Array.isArray(item.affectedServiceIds)
      ? item.affectedServiceIds.filter((value): value is string => typeof value === 'string')
      : [],
  }));
  const uptime30Values = uptime30 as Record<string, number>;
  const uptime90Values = uptime90 as Record<string, number>;
  const services = page.services.map(mapping => {
    const impact = impactByService.get(mapping.serviceId);
    const state = impact?.active
      ? getWorstPublicStatus(impact.statuses)
      : 'OPERATIONAL';
    const serviceHistoryIncidents = historyIncidentsByService.get(mapping.serviceId) ?? [];
    const history = visibility.showUptime ? {
      rangeStart: window.start.toISOString(),
      rangeEnd: now.toISOString(),
      coverage: 'COMPLETE' as const,
      segments: buildPublicHistorySegments({
      serviceId: mapping.serviceId,
      incidents: serviceHistoryIncidents,
      maintenance: maintenanceHistory,
      start: window.start,
      end: now,
      }),
    } : undefined;
    const status = normalizePublicStatus(projectServiceStatus(mapping.serviceId, state, maintenance));
    return {
      id: mapping.serviceId,
      name: mapping.displayName || mapping.service.name,
      ...(page.showServiceDescriptions ? { description: mapping.service.description } : {}),
      ...(page.showServiceRegions && mapping.service.region
        ? { regions: mapping.service.region.split(',').map(value => value.trim()).filter(Boolean) }
        : {}),
      ...(visibility.showServiceSlaTier ? { slaTier: mapping.service.slaTier } : {}),
      ...(visibility.showTeam ? { team: mapping.service.team } : {}),
      status,
      activeIncidentCount: impact?.active ?? 0,
      ...(visibility.showUptime ? {
        uptime: {
          days30: {
            percentage: measuredDays30 >= 30 ? (uptime30Values[mapping.serviceId] ?? null) : null,
            incidentCount: serviceHistoryIncidents.filter(item => item.createdAt <= now && (item.resolvedAt ?? now) >= window30.start).length,
            measuredDays: Math.min(30, measuredDays30), complete: measuredDays30 >= 30,
          },
          days90: {
            percentage: measuredDays90 >= 90 ? (uptime90Values[mapping.serviceId] ?? null) : null,
            incidentCount: serviceHistoryIncidents.filter(item => item.createdAt <= now && (item.resolvedAt ?? now) >= window90.start).length,
            measuredDays: Math.min(90, measuredDays90), complete: measuredDays90 >= 90,
          },
        },
        history,
      } : {}),
    };
  });
  return {
    schemaVersion: 3,
    pageId,
    revision,
    generatedAt: now.toISOString(),
    page: {
      id: page.id,
      name: page.name,
      organizationName: page.organizationName,
      branding: page.branding,
      showSubscribe: page.showSubscribe,
      showServicesByRegion: page.showServicesByRegion,
      showRegionHeatmap: page.showRegionHeatmap,
      showPostIncidentReview: page.showPostIncidentReview,
      showChangelog: page.showChangelog,
      enableUptimeExports: page.enableUptimeExports,
      footerText: page.footerText,
      contactEmail: page.contactEmail,
      contactUrl: page.contactUrl,
      slug: page.slug,
      customDomain: page.customDomain,
      subdomain: page.subdomain,
      isDefault: page.isDefault,
      requireAuth: page.requireAuth,
      enabled: page.enabled,
      statusApiRequireToken: page.statusApiRequireToken,
      statusApiRateLimitEnabled: page.statusApiRateLimitEnabled,
      statusApiRateLimitMax: page.statusApiRateLimitMax,
      statusApiRateLimitWindowSec: page.statusApiRateLimitWindowSec,
    },
    status: getWorstPublicStatus(services.map(service => service.status)),
    services: visibility.showServices ? services : [],
    regions: visibility.showServices ? aggregatePublicRegions(services) : [],
    incidents: incidents.map(incident => serializePublicStatusIncident(incident, page)),
    announcements: page.announcements
      .filter(item => item.startDate <= now && (!item.endDate || item.endDate > now))
      .map(item => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate?.toISOString() ?? null,
      })),
    historyDays: limits.historyDays,
  };
}

/**
 * What a publish attempt actually did.
 *
 * Callers need to tell "the page is now live" from "someone else is already publishing it", so
 * that a save racing the background projector is not reported to an administrator as a failure.
 */
export type StatusPagePublishOutcome =
  /** The snapshot was built, committed and pushed to the serving store. */
  | { kind: 'published'; revision: string }
  /** The page is disabled, so there is deliberately nothing to serve. */
  | { kind: 'disabled'; revision: string }
  /** Another builder holds the lease. It will finish the work; nothing is wrong. */
  | { kind: 'contended' }
  /** The revision moved under us. A later build already covers this change. */
  | { kind: 'superseded' }
  /** Building or publishing threw. The previous payload is untouched. */
  | { kind: 'failed'; error: unknown };

export type StatusPagePublishOptions = {
  /** Lease attempts before reporting contention. Each attempt uses its own transaction. */
  lockAttempts?: number;
  lockRetryDelayMs?: number;
  /** Wall-clock budget, also applied server-side via statement_timeout. */
  budgetMs?: number;
};

const DEFAULT_PUBLISH_BUDGET_MS = 30_000;

/** A PostgreSQL lease prevents simultaneous builders; revision CAS rejects a stale build. */
export async function rebuildStatusPageSnapshot(pageId: string) {
  const outcome = await publishStatusPageSnapshot(pageId);
  return outcome.kind === 'published';
}

/**
 * Build and publish one page, reporting precisely what happened.
 *
 * Ordering is load-bearing throughout: the commit happens in a single transaction so a partial
 * write cannot be observed, and the store receives snapshot, then manifest, then routes, so a
 * manifest never points at a body that is not yet readable and a route never resolves to a page
 * with no manifest.
 */
export async function publishStatusPageSnapshot(
  pageId: string,
  options: StatusPagePublishOptions = {}
): Promise<StatusPagePublishOutcome> {
  const budgetMs = Math.max(1_000, options.budgetMs ?? DEFAULT_PUBLISH_BUDGET_MS);
  const attempts = Math.max(1, options.lockAttempts ?? 1);
  const retryDelayMs = Math.max(0, options.lockRetryDelayMs ?? 50);
  const deadline = Date.now() + budgetMs;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return { kind: 'contended' };
    let result: Awaited<ReturnType<typeof buildAndCommitSnapshot>>;
    try {
      result = await buildAndCommitSnapshot(pageId, remainingMs);
    } catch (error) {
      return { kind: 'failed', error };
    }
    if (result === 'contended') {
      // Retry in a fresh transaction rather than holding one open, so a busy page never pins a
      // pooled connection while it waits.
      if (attempt + 1 < attempts && retryDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
      continue;
    }
    if (result === 'superseded') return { kind: 'superseded' };
    if (result === 'missing') {
      // No control row: the page was deleted between resolving it and building it.
      return { kind: 'failed', error: new Error(`No snapshot row for status page ${pageId}`) };
    }
    if (!result.snapshot) return { kind: 'disabled', revision: result.revision };
    try {
      await pushSnapshotToServingStore(pageId, result.revision, result.snapshot);
    } catch (error) {
      return { kind: 'failed', error };
    }
    return { kind: 'published', revision: result.revision };
  }
  return { kind: 'contended' };
}

async function buildAndCommitSnapshot(
  pageId: string,
  remainingMs: number
): Promise<
  | 'contended'
  | 'missing'
  | 'superseded'
  | { snapshot: StatusPageSnapshot | null; revision: string }
> {
  const result = await prisma.$transaction(
    async tx => {
      // Abort server-side rather than letting a slow build outlive the caller's budget.
      await tx.$executeRawUnsafe(
        `SET LOCAL statement_timeout = ${Math.max(1_000, Math.floor(remainingMs))}`
      );
      const locks = await tx.$queryRaw<
        Array<{ acquired: boolean }>
      >`SELECT pg_try_advisory_xact_lock(hashtextextended(${`status-snapshot:${pageId}`}, 0)) AS acquired`;
      if (!locks[0]?.acquired) return 'contended' as const;
      const rows = await tx.$queryRaw<
        Array<{ revision: bigint }>
      >`SELECT "revision" FROM "StatusPageSnapshot" WHERE "statusPageId" = ${pageId}`;
      if (!rows[0]) return 'missing' as const;
      const revision = rows[0].revision;
      const snapshot = await buildStatusPageSnapshot(pageId, revision.toString());
      // The only writer of LIVE. A disabled page records DISABLED so the reader can tell
      // "turned off" from "temporarily unavailable".
      const changed = await tx.$executeRaw`
      UPDATE "StatusPageSnapshot" SET "payload" = ${snapshot ? JSON.stringify(snapshot) : null}::jsonb,
        "publishedRevision" = ${revision}, "generatedAt" = NOW(), "lastError" = NULL,
        "servingState" = ${snapshot ? 'LIVE' : 'DISABLED'}
      WHERE "statusPageId" = ${pageId} AND "revision" = ${revision}
    `;
      // Drivers can surface row counts as either number or bigint; normalize at this boundary.
      return Number(changed) === 1
        ? { snapshot, revision: revision.toString() }
        : ('superseded' as const);
    },
    { timeout: 30_000 }
  );
  return result;
}

async function pushSnapshotToServingStore(
  pageId: string,
  revision: string,
  snapshot: StatusPageSnapshot
) {
  const store = getStatusPageServingStore();
  const result = { snapshot, revision };
  await store.publishSnapshot(
    pageId,
    result.revision,
    result.snapshot as unknown as Prisma.JsonValue
  );
  await store.publishManifest({
    pageId,
    revision: result.revision,
    enabled: true,
    revoked: false,
    snapshotKey: `${result.revision}.json`,
    publishedAt: result.snapshot.generatedAt,
    schemaVersion: result.snapshot.schemaVersion,
    integrityHash: statusSnapshotIntegrity(result.snapshot as unknown as Prisma.JsonValue),
    servingState: 'LIVE',
    lastGoodRevision: result.revision,
    lastGoodSnapshotKey: `${result.revision}.json`,
    lastGoodIntegrityHash: statusSnapshotIntegrity(
      result.snapshot as unknown as Prisma.JsonValue
    ),
  });
  const slug = result.snapshot.page?.slug;
  const route: StatusServingRoute = {
    pageId,
    slug: slug ?? null,
    requireAuth: result.snapshot.page.requireAuth,
    revision: result.revision,
  };
  if (slug) await store.publishRoute(slug, route);
  if (result.snapshot.page?.isDefault) await store.publishRoute('default', route);
  if (result.snapshot.page.customDomain) {
    await store.publishRoute(`domain:${result.snapshot.page.customDomain.toLowerCase()}`, route);
  }
  if (result.snapshot.page.subdomain) {
    await store.publishRoute(`subdomain:${result.snapshot.page.subdomain.toLowerCase()}`, route);
  }
}

/** Bounded reconciliation also advances maintenance boundaries and time-derived uptime. */
export async function reconcileStatusPageSnapshots(limit = 10) {
  const [health] = await prisma.$queryRaw<
    Array<{
      dirty: bigint;
      oldestAgeSeconds: number | null;
      failed: bigint;
      failClosed: bigint;
    }>
  >`
    SELECT
      COUNT(*) FILTER (WHERE "publishedRevision" <> "revision") AS "dirty",
      EXTRACT(EPOCH FROM (NOW() - MIN("generatedAt")))::double precision AS "oldestAgeSeconds",
      COUNT(*) FILTER (WHERE "lastError" IS NOT NULL) AS "failed",
      COUNT(*) FILTER (WHERE "servingState" = 'FAIL_CLOSED') AS "failClosed"
    FROM "StatusPageSnapshot"
  `;
  setOperationalGauge('opsknight_status_page_snapshot_dirty', Number(health?.dirty ?? 0));
  setOperationalGauge(
    'opsknight_status_page_snapshot_oldest_age_seconds',
    Math.max(0, health?.oldestAgeSeconds ?? 0)
  );
  // The two alerting signals: a publication that keeps failing, and a page currently withheld
  // from the public. Either persisting is an operator problem, not a transient.
  setOperationalGauge('opsknight_status_page_publication_failed', Number(health?.failed ?? 0));
  setOperationalGauge('opsknight_status_page_fail_closed', Number(health?.failClosed ?? 0));

  const pages = await prisma.$queryRaw<
    Array<{ statusPageId: string; dirty: boolean; servingState: string }>
  >`
    SELECT "statusPageId", "servingState", ("publishedRevision" <> "revision") AS "dirty"
    FROM "StatusPageSnapshot"
    WHERE "publishedRevision" <> "revision" OR "generatedAt" < NOW() - INTERVAL '1 minute'
    ORDER BY "generatedAt" ASC NULLS FIRST LIMIT ${Math.max(1, Math.min(50, limit))}
  `;
  let rebuilt = 0;
  for (const page of pages) {
    try {
      // A dirty revision of unknown provenance may represent disclosure tightening and must
      // fail closed. A row already carrying a non-LIVE state holds a decision the control plane
      // made deliberately, and overwriting it here would flap the page dark between an
      // administrator's commit and its synchronous republish.
      if (page.dirty && page.servingState === 'LIVE') {
        await getStatusPageServingStore().revoke(page.statusPageId, 'PRIVACY');
      }
      if (await rebuildStatusPageSnapshot(page.statusPageId)) {
        rebuilt++;
        addOperationalMetric('opsknight_status_page_snapshot_rebuild_total', 1, {
          outcome: 'success',
        });
      }
    } catch {
      addOperationalMetric('opsknight_status_page_snapshot_rebuild_total', 1, {
        outcome: 'failure',
      });
      await prisma.$executeRaw`UPDATE "StatusPageSnapshot" SET "lastError" = 'Projection failed; retry pending' WHERE "statusPageId" = ${page.statusPageId}`;
    }
  }
  return { attempted: pages.length, rebuilt };
}

export async function readStatusPageSnapshot(pageId: string): Promise<StatusPageSnapshot | null> {
  const rows = await prisma.$queryRaw<Array<{ payload: Prisma.JsonValue }>>`
    SELECT "payload" FROM "StatusPageSnapshot" WHERE "statusPageId" = ${pageId}
  `;
  return parseStatusPageSnapshot(pageId, rows[0]?.payload);
}

/**
 * Return a sanitized projection, preferring the current revision.
 *
 * When the current revision is not servable, the previous one is used only if the control plane
 * marked the invalidation as benign. That marker is written exclusively by a configuration change
 * classified as non-tightening, so every disclosure-narrowing transition -- a tightened setting, a
 * disabled page, or any invalidation of unknown provenance, including the database triggers that
 * cannot classify themselves -- leaves the marker fail-closed and withholds everything.
 *
 * The fallback body is safe to show because it is a previously published projection, already
 * sanitized under a disclosure policy at least as broad as the one now in force. The access gate
 * cannot be weakened this way either: raising `requireAuth` classifies as tightening and fails
 * closed, while lowering it can only leave a stale `true` behind, which merely over-prompts.
 */
export async function getStatusPageSnapshot(pageId: string): Promise<{
  snapshot: StatusPageSnapshot | null;
  stale: boolean;
}> {
  const store = getStatusPageServingStore();
  const manifest = await store.readManifest(pageId);
  if (!manifest) return { snapshot: null, stale: true };

  if (manifest.enabled && !manifest.revoked) {
    const payload = await store.readSnapshot(pageId, manifest.revision);
    if (payload && statusSnapshotIntegrity(payload) === manifest.integrityHash) {
      const current = parseStatusPageSnapshot(pageId, payload);
      if (current) return { snapshot: current, stale: false };
    }
  }

  if (manifestServingState(manifest) === 'STALE_OK') {
    const lastGood = await store.readLastGoodSnapshot(pageId);
    const previous = lastGood ? parseStatusPageSnapshot(pageId, lastGood.payload) : null;
    if (previous) {
      addOperationalMetric('opsknight_status_page_stale_serves_total', 1, { surface: 'snapshot' });
      return { snapshot: previous, stale: true };
    }
  }

  return { snapshot: null, stale: true };
}

export async function getStatusPageSnapshotByRoute(routeKey: string) {
  const store = getStatusPageServingStore();
  const route = await store.resolveRoute(routeKey || 'default');
  return route
    ? { pageId: route.pageId, ...(await getStatusPageSnapshot(route.pageId)) }
    : { pageId: null, snapshot: null, stale: true };
}
