import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import type { PublicStatusPageSnapshot } from './public-contract';
import { aggregatePublicRegions } from './history';
import { normalizePublicStatus } from './status-presentation';

const status = z.enum([
  'OPERATIONAL',
  'DEGRADED',
  'MAINTENANCE',
  'PARTIAL_OUTAGE',
  'MAJOR_OUTAGE',
  'UNKNOWN',
]);
const dateTime = z.string().datetime({ offset: true });

const uptimeWindow = z.object({
  percentage: z.number().min(0).max(100).nullable(),
  incidentCount: z.number().int().nonnegative(),
  measuredDays: z.number().nonnegative(),
  complete: z.boolean(),
}).strict();

const historyDay = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status,
  incidentCount: z.number().int().nonnegative(),
  availabilityPercent: z.number().min(0).max(100).nullable(),
  timeline: z.array(z.object({
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(0).max(1440),
    status,
  }).strict()).optional(),
}).strict();

const incidentUpdate = z.object({
  id: z.string(),
  type: z.enum(['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'ACKNOWLEDGED', 'RESOLVED', 'UPDATE']),
  message: z.string(),
  createdAt: dateTime.optional(),
}).strict();

export const publicStatusPageSnapshotSchema = z.object({
  schemaVersion: z.literal(3),
  pageId: z.string(),
  revision: z.string(),
  generatedAt: dateTime,
  page: z.object({
    id: z.string(),
    name: z.string(),
    organizationName: z.string().nullable().optional(),
    branding: z.unknown().optional(),
    showSubscribe: z.boolean(),
    showServicesByRegion: z.boolean(),
    showRegionHeatmap: z.boolean(),
    showPostIncidentReview: z.boolean(),
    showChangelog: z.boolean(),
    enableUptimeExports: z.boolean(),
    footerText: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    contactUrl: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    customDomain: z.string().nullable().optional(),
    subdomain: z.string().nullable().optional(),
    isDefault: z.boolean(),
    requireAuth: z.boolean(),
    enabled: z.boolean(),
    statusApiRequireToken: z.boolean(),
    statusApiRateLimitEnabled: z.boolean(),
    statusApiRateLimitMax: z.number().int().positive(),
    statusApiRateLimitWindowSec: z.number().int().positive(),
  }).strict(),
  status,
  services: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    regions: z.array(z.string()).optional(),
    status,
    activeIncidentCount: z.number().int().nonnegative(),
    team: z.object({ id: z.string(), name: z.string() }).strict().nullable().optional(),
    slaTier: z.string().nullable().optional(),
    uptime: z.object({ days30: uptimeWindow, days90: uptimeWindow }).strict().optional(),
    history: z.array(historyDay).optional(),
  }).strict()),
  regions: z.array(z.object({
    name: z.string(), status, totalServices: z.number().int().nonnegative(),
    operationalServices: z.number().int().nonnegative(), degradedServices: z.number().int().nonnegative(),
    maintenanceServices: z.number().int().nonnegative(), partialOutageServices: z.number().int().nonnegative(),
    majorOutageServices: z.number().int().nonnegative(), unknownServices: z.number().int().nonnegative(),
    impactedServices: z.number().int().nonnegative(), serviceIds: z.array(z.string()),
  }).strict()),
  incidents: z.array(z.object({
    id: z.string().optional(), title: z.string().optional(), description: z.string().optional(),
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED', 'SUPPRESSED']),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    createdAt: dateTime.optional(), acknowledgedAt: dateTime.optional(), resolvedAt: dateTime.optional(),
    service: z.object({ id: z.string().optional(), name: z.string().optional(), regions: z.array(z.string()).optional() }).strict().optional(),
    updates: z.array(incidentUpdate).optional(), postIncidentReview: z.boolean().optional(),
  }).strict()),
  announcements: z.array(z.object({
    id: z.string(), title: z.string(), message: z.string(), type: z.string(),
    startDate: dateTime, endDate: dateTime.nullable(),
  }).strict()),
  historyDays: z.number().int().positive(),
}).strict();

export function parsePublicStatusPageSnapshot(
  pageId: string,
  payload: Prisma.JsonValue | null | undefined
): PublicStatusPageSnapshot | null {
  const parsed = publicStatusPageSnapshotSchema.safeParse(payload);
  if (parsed.success && parsed.data.pageId === pageId) return parsed.data as PublicStatusPageSnapshot;
  const legacy = legacySnapshotSchema.safeParse(payload);
  if (!legacy.success || legacy.data.pageId !== pageId) return null;
  const services = legacy.data.services.map(service => ({
    id: service.id,
    name: service.name,
    ...(service.description !== undefined ? { description: service.description } : {}),
    ...(service.region ? { regions: service.region.split(',').map(value => value.trim()).filter(Boolean) } : {}),
    status: normalizePublicStatus(service.status),
    activeIncidentCount: service.activeIncidentCount ?? 0,
    ...(legacy.data.uptime || legacy.data.uptime30 ? { uptime: {
      days30: { percentage: legacy.data.uptime30?.[service.id] ?? null, incidentCount: 0, measuredDays: 30, complete: true },
      days90: { percentage: legacy.data.uptime?.[service.id] ?? null, incidentCount: 0, measuredDays: 90, complete: true },
    } } : {}),
  }));
  const candidate = {
    schemaVersion: 3 as const, pageId, revision: legacy.data.revision,
    generatedAt: legacy.data.generatedAt,
    page: legacy.data.page,
    status: normalizePublicStatus(legacy.data.status),
    services,
    regions: aggregatePublicRegions(services),
    incidents: legacy.data.incidents.map(incident => ({
      status: incident.status,
      ...(incident.id ? { id: incident.id } : {}),
      ...(incident.title ? { title: incident.title } : {}),
      ...(incident.description ? { description: incident.description } : {}),
      ...(incident.urgency ? { urgency: incident.urgency } : {}),
      ...(incident.createdAt ? { createdAt: incident.createdAt } : {}),
      ...(incident.resolvedAt ? { resolvedAt: incident.resolvedAt } : {}),
      ...(incident.postIncidentReview ? { postIncidentReview: true } : {}),
      ...(incident.service ? { service: {
        ...(incident.service.name ? { name: incident.service.name } : {}),
        ...(incident.service.region ? { regions: incident.service.region.split(',').map(value => value.trim()).filter(Boolean) } : {}),
      } } : {}),
    })),
    announcements: legacy.data.announcements,
    historyDays: legacy.data.historyDays,
  };
  const migrated = publicStatusPageSnapshotSchema.safeParse(candidate);
  return migrated.success ? migrated.data as PublicStatusPageSnapshot : null;
}

const legacySnapshotSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]), pageId: z.string(), revision: z.string(),
  generatedAt: dateTime, status: z.string(),
  page: publicStatusPageSnapshotSchema.shape.page,
  services: z.array(z.object({
    id: z.string(), name: z.string(), description: z.string().nullable().optional(),
    region: z.string().nullable().optional(), status: z.string(),
    activeIncidentCount: z.number().int().nonnegative().optional(),
  }).passthrough()),
  incidents: z.array(z.object({
    id: z.string().optional(), title: z.string().optional(), description: z.string().optional(),
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED', 'SUPPRESSED']),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(), createdAt: dateTime.optional(),
    resolvedAt: dateTime.nullable().optional(),
    service: z.object({ name: z.string().optional(), region: z.string().nullable().optional() }).optional(),
    postIncidentReview: z.boolean().optional(),
  }).passthrough()),
  uptime: z.record(z.string(), z.number()).optional(),
  uptime30: z.record(z.string(), z.number()).optional(),
  announcements: publicStatusPageSnapshotSchema.shape.announcements,
  historyDays: z.number().int().positive(),
}).passthrough();
