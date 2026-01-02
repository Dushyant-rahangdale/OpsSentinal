/**
 * Client-safe SLA utilities (pure functions, no database access)
 * For server-only functions that use Prisma, see ./sla-server.ts
 */

export type SLAMetrics = {
  // Incident Lifecycle (minutes)
  mttr: number | null;
  mttd: number | null;
  mtti: number | null;
  mttk: number | null;
  mttaP50: number | null;
  mttaP95: number | null;
  mttrP50: number | null;
  mttrP95: number | null;
  mtbfMs: number | null;

  // SLA Compliance
  ackCompliance: number;
  resolveCompliance: number;
  ackBreaches: number;
  resolveBreaches: number;

  // Counts
  totalIncidents: number;
  activeIncidents: number;
  unassignedActive: number;
  highUrgencyCount: number;
  alertsCount: number;

  // Rates
  ackRate: number;
  resolveRate: number;
  highUrgencyRate: number;
  afterHoursRate: number;
  alertsPerIncident: number;
  escalationRate: number;
  reopenRate: number;
  autoResolveRate: number;

  previousPeriod: {
    totalIncidents: number;
    mtta: number | null;
    mttr: number | null;
    ackRate: number;
    resolveRate: number;
  };

  // Coverage
  coveragePercent: number;
  coverageGapDays: number;
  onCallHoursMs: number;
  onCallUsersCount: number;
  activeOverrides: number;

  // Events
  autoResolvedCount: number;
  manualResolvedCount: number;
  eventsCount: number;

  // Golden Signals
  avgLatencyP99: number | null;
  errorRate: number | null;
  totalRequests: number;
  saturation: number | null;

  // Chart Data
  trendSeries: Array<{
    key: string;
    label: string;
    count: number;
    mtta: number;
    mttr: number;
    ackRate: number;
    resolveRate: number;
    ackCompliance: number;
    escalationRate: number;
  }>;
  statusMix: Array<{ status: string; count: number }>;
  urgencyMix: Array<{ urgency: string; count: number }>;
  topServices: Array<{ id: string; name: string; count: number }>;
  assigneeLoad: Array<{ id: string; name: string; count: number }>;
  statusAges: Array<{ status: string; avgMs: number | null }>;
  onCallLoad: Array<{ id: string; name: string; hoursMs: number; incidentCount: number }>;
  serviceSlaTable: Array<{
    id: string;
    name: string;
    ackRate: number;
    resolveRate: number;
    total: number;
  }>;

  // V2 Additions (V1 Parity)
  recurringTitles: Array<{ title: string; count: number }>;
  eventsPerIncident: number;
  heatmapData: Array<{ date: string; count: number }>;

  // New Enhanced Features
  serviceMetrics: Array<{
    id: string;
    name: string;
    count: number;
    mtta: number;
    mttr: number;
    slaBreaches: number;
    status: string;
  }>;
  insights: Array<{
    type: string;
    text: string;
  }>;
};

/**
 * Format time in minutes to human-readable string
 */
// Re-export for backward compatibility
export { formatTimeMinutes, formatTimeMinutesMs } from './time-format';

/**
 * Calculate Mean Time To Acknowledge (MTTA) for a single incident
 * Returns time in milliseconds
 */
export function calculateMTTA(incident: {
  acknowledgedAt: Date | null;
  createdAt: Date;
}): number | null {
  if (incident.acknowledgedAt && incident.createdAt) {
    return incident.acknowledgedAt.getTime() - incident.createdAt.getTime();
  }
  return null;
}

/**
 * Calculate Mean Time To Resolve (MTTR) for a single incident
 * Returns time in milliseconds
 */
export function calculateMTTR(incident: {
  resolvedAt: Date | null;
  createdAt: Date;
}): number | null {
  if (incident.resolvedAt && incident.createdAt) {
    return incident.resolvedAt.getTime() - incident.createdAt.getTime();
  }
  return null;
}

/**
 * Check if an incident met the acknowledgement SLA
 */
export function checkAckSLA(
  incident: { acknowledgedAt: Date | null; createdAt: Date },
  service: { targetAckMinutes?: number | null }
): boolean {
  if (!incident.acknowledgedAt || !incident.createdAt) return false;
  const ackTimeMinutes =
    (incident.acknowledgedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
  const target = service.targetAckMinutes ?? 15; // Default to 15 minutes
  return ackTimeMinutes <= target;
}

/**
 * Check if an incident met the resolution SLA
 */
export function checkResolveSLA(
  incident: { resolvedAt: Date | null; createdAt: Date },
  service: { targetResolveMinutes?: number | null }
): boolean {
  if (!incident.resolvedAt || !incident.createdAt) return false;
  const resolveTimeMinutes =
    (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60;
  const target = service.targetResolveMinutes ?? 120; // Default to 120 minutes
  return resolveTimeMinutes <= target;
}
