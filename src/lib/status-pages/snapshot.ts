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

/** A PostgreSQL lease prevents simultaneous builders; revision CAS rejects a stale build. */
export async function rebuildStatusPageSnapshot(pageId: string) {
  const result = await prisma.$transaction(
    async tx => {
      const locks = await tx.$queryRaw<
        Array<{ acquired: boolean }>
      >`SELECT pg_try_advisory_xact_lock(hashtextextended(${`status-snapshot:${pageId}`}, 0)) AS acquired`;
      if (!locks[0]?.acquired) return null;
      const rows = await tx.$queryRaw<
        Array<{ revision: bigint }>
      >`SELECT "revision" FROM "StatusPageSnapshot" WHERE "statusPageId" = ${pageId}`;
      if (!rows[0]) return null;
      const revision = rows[0].revision;
      const snapshot = await buildStatusPageSnapshot(pageId, revision.toString());
      const changed = await tx.$executeRaw`
      UPDATE "StatusPageSnapshot" SET "payload" = ${snapshot ? JSON.stringify(snapshot) : null}::jsonb,
        "publishedRevision" = ${revision}, "generatedAt" = NOW(), "lastError" = NULL
      WHERE "statusPageId" = ${pageId} AND "revision" = ${revision}
    `;
      // Drivers can surface row counts as either number or bigint; normalize at this boundary.
      return Number(changed) === 1 ? { snapshot, revision: revision.toString() } : null;
    },
    { timeout: 30_000 }
  );
  if (!result?.snapshot) return false;
  const store = getStatusPageServingStore();
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
  return true;
}

/** Bounded reconciliation also advances maintenance boundaries and time-derived uptime. */
export async function reconcileStatusPageSnapshots(limit = 10) {
  const [health] = await prisma.$queryRaw<
    Array<{ dirty: bigint; oldestAgeSeconds: number | null }>
  >`
    SELECT
      COUNT(*) FILTER (WHERE "publishedRevision" <> "revision") AS "dirty",
      EXTRACT(EPOCH FROM (NOW() - MIN("generatedAt")))::double precision AS "oldestAgeSeconds"
    FROM "StatusPageSnapshot"
  `;
  setOperationalGauge('opsknight_status_page_snapshot_dirty', Number(health?.dirty ?? 0));
  setOperationalGauge(
    'opsknight_status_page_snapshot_oldest_age_seconds',
    Math.max(0, health?.oldestAgeSeconds ?? 0)
  );

  const pages = await prisma.$queryRaw<Array<{ statusPageId: string; dirty: boolean }>>`
    SELECT "statusPageId", ("publishedRevision" <> "revision") AS "dirty"
    FROM "StatusPageSnapshot"
    WHERE "publishedRevision" <> "revision" OR "generatedAt" < NOW() - INTERVAL '1 minute'
    ORDER BY "generatedAt" ASC NULLS FIRST LIMIT ${Math.max(1, Math.min(50, limit))}
  `;
  let rebuilt = 0;
  for (const page of pages) {
    try {
      // A dirty revision may represent disclosure tightening and must fail closed.
      // Purely time-derived refreshes retain the current healthy manifest until the
      // replacement snapshot is successfully published.
      if (page.dirty) await getStatusPageServingStore().revoke(page.statusPageId);
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
 * Return only a revision-current sanitized projection. Dirty payloads remain in
 * storage for recovery/diagnostics but are never returned to a public renderer.
 */
export async function getStatusPageSnapshot(pageId: string): Promise<{
  snapshot: StatusPageSnapshot | null;
  stale: boolean;
}> {
  const store = getStatusPageServingStore();
  const manifest = await store.readManifest(pageId);
  if (!manifest?.enabled || manifest.revoked) return { snapshot: null, stale: true };
  const payload = await store.readSnapshot(pageId, manifest.revision);
  if (!payload || statusSnapshotIntegrity(payload) !== manifest.integrityHash) {
    return { snapshot: null, stale: true };
  }
  const current = parseStatusPageSnapshot(pageId, payload);
  return current ? { snapshot: current, stale: false } : { snapshot: null, stale: true };
}

export async function getStatusPageSnapshotByRoute(routeKey: string) {
  const store = getStatusPageServingStore();
  const route = await store.resolveRoute(routeKey || 'default');
  return route
    ? { pageId: route.pageId, ...(await getStatusPageSnapshot(route.pageId)) }
    : { pageId: null, snapshot: null, stale: true };
}
