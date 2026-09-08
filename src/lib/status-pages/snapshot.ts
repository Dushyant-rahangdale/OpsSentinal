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
import {
  projectOverallStatus,
  projectServiceStatus,
  visibleMaintenanceServiceIds,
} from '@/lib/status-page-projection';
import { calculateMultiServiceUptime } from '@/lib/sla-server';
import { addOperationalMetric, setOperationalGauge } from '@/lib/metrics/operational/registry';
import { getStatusPageServingStore } from './serving-store';

export type StatusHistoryDay = {
  date: string;
  status: 'operational' | 'degraded' | 'outage';
};

export type StatusPageSnapshot = {
  schemaVersion: 1 | 2;
  pageId: string;
  revision: string;
  generatedAt: string;
  status: 'operational' | 'degraded' | 'maintenance' | 'outage';
  services: Array<{
    id: string;
    name: string;
    description?: string | null;
    region?: string | null;
    slaTier?: string | null;
    team?: { id: string; name: string } | null;
    status: string;
    activeIncidentCount?: number;
  }>;
  incidents: Array<Record<string, unknown>>;
  uptime: Record<string, number>;
  statusHistory?: Record<string, StatusHistoryDay[]>;
  announcements: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    startDate: string;
    endDate: string | null;
  }>;
  historyDays: number;
};

function parseStatusPageSnapshot(
  pageId: string,
  payload: Prisma.JsonValue | null | undefined
): StatusPageSnapshot | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Prisma.JsonObject;
  if ((record.schemaVersion !== 1 && record.schemaVersion !== 2) || record.pageId !== pageId)
    return null;
  return payload as unknown as StatusPageSnapshot;
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
  const window = await getReportingWindowForDays(limits.historyDays, 'incident', now);
  const [groups, incidents, uptime, affectedHistoryDays] = ids.length
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
                resolvedAt: true,
                service: { select: { name: true, region: true } },
                postmortem: { select: { status: true, isPublic: true } },
              },
            })
          : [],
        visibility.showUptime ? calculateMultiServiceUptime(ids, window.start, now, 'PUBLIC') : {},
        visibility.showUptime
          ? prisma.$queryRaw<Array<{ serviceId: string; date: Date; outage: boolean }>>`
              SELECT i."serviceId", d.day AS date,
                BOOL_OR(i.urgency = 'HIGH') AS outage
              FROM generate_series(
                date_trunc('day', ${window.start}::timestamp),
                date_trunc('day', ${now}::timestamp),
                interval '1 day'
              ) AS d(day)
              JOIN "Incident" i ON i."serviceId" IN (${Prisma.join(ids)})
                AND i.visibility = 'PUBLIC'
                AND i.status NOT IN ('SUPPRESSED', 'SNOOZED')
                AND i."createdAt" < d.day + interval '1 day'
                AND COALESCE(i."resolvedAt", ${now}) > d.day
              GROUP BY i."serviceId", d.day
              ORDER BY i."serviceId", d.day
            `
          : [],
      ])
    : [[], [], {}, []];

  const impactByService = new Map<string, { active: number; critical: boolean }>();
  for (const group of groups) {
    const current = impactByService.get(group.serviceId) || { active: 0, critical: false };
    current.active += group._count._all;
    if (group.urgency === 'HIGH') current.critical = true;
    impactByService.set(group.serviceId, current);
  }

  const maintenance = visibleMaintenanceServiceIds(page.announcements, ids, now);
  const services = page.services.map(mapping => {
    const impact = impactByService.get(mapping.serviceId);
    const state = impact?.critical ? 'MAJOR_OUTAGE' : impact?.active ? 'DEGRADED' : 'OPERATIONAL';
    return {
      id: mapping.serviceId,
      name: mapping.displayName || mapping.service.name,
      ...(page.showServiceDescriptions ? { description: mapping.service.description } : {}),
      ...(page.showServiceRegions ? { region: mapping.service.region } : {}),
      ...(visibility.showServiceSlaTier ? { slaTier: mapping.service.slaTier } : {}),
      ...(visibility.showTeam ? { team: mapping.service.team } : {}),
      status: projectServiceStatus(mapping.serviceId, state, maintenance),
      activeIncidentCount: impact?.active ?? 0,
    };
  });
  const impactStates = Array.from(impactByService.values());

  return {
    schemaVersion: 2,
    pageId,
    revision,
    generatedAt: now.toISOString(),
    status: projectOverallStatus(
      impactStates.some(impact => impact.critical),
      impactStates.some(impact => impact.active > 0),
      maintenance
    ),
    services: visibility.showServices ? services : [],
    incidents: incidents.map(incident => serializePublicStatusIncident(incident, page)),
    uptime,
    statusHistory: ids.reduce<Record<string, StatusHistoryDay[]>>((history, serviceId) => {
      const affected = new Map(
        affectedHistoryDays
          .filter(day => day.serviceId === serviceId)
          .map(day => [
            day.date.toISOString().slice(0, 10),
            day.outage ? ('outage' as const) : ('degraded' as const),
          ])
      );
      const cursor = new Date(window.start);
      cursor.setUTCHours(0, 0, 0, 0);
      const days: StatusHistoryDay[] = [];
      while (cursor <= now) {
        const date = cursor.toISOString().slice(0, 10);
        days.push({ date, status: affected.get(date) ?? 'operational' });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      // Service ids originate from the database and the result is serialized as data only.
      // eslint-disable-next-line security/detect-object-injection
      history[serviceId] = days.slice(-90);
      return history;
    }, {}),
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
  });
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

  const pages = await prisma.$queryRaw<Array<{ statusPageId: string }>>`
    SELECT "statusPageId" FROM "StatusPageSnapshot"
    WHERE "publishedRevision" <> "revision" OR "generatedAt" < NOW() - INTERVAL '1 minute'
    ORDER BY "generatedAt" ASC NULLS FIRST LIMIT ${Math.max(1, Math.min(50, limit))}
  `;
  let rebuilt = 0;
  for (const page of pages) {
    try {
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
  const current = parseStatusPageSnapshot(pageId, payload);
  return current ? { snapshot: current, stale: false } : { snapshot: null, stale: true };
}
