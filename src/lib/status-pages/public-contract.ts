export const PUBLIC_SERVICE_STATUSES = [
  'OPERATIONAL',
  'DEGRADED',
  'MAINTENANCE',
  'PARTIAL_OUTAGE',
  'MAJOR_OUTAGE',
  'UNKNOWN',
] as const;

export type PublicServiceStatus = (typeof PUBLIC_SERVICE_STATUSES)[number];
export type PublicHistoryStatus = PublicServiceStatus;

export interface PublicHistorySlice {
  startMinute: number;
  endMinute: number;
  status: PublicHistoryStatus;
}

export interface PublicStatusHistoryDay {
  date: string;
  status: PublicHistoryStatus;
  incidentCount: number;
  availabilityPercent: number | null;
  timeline?: PublicHistorySlice[];
}

export interface PublicUptimeWindow {
  percentage: number | null;
  incidentCount: number;
  measuredDays: number;
  complete: boolean;
}

export interface PublicStatusService {
  id: string;
  name: string;
  description?: string | null;
  regions?: string[];
  status: PublicServiceStatus;
  activeIncidentCount: number;
  team?: { id: string; name: string } | null;
  slaTier?: string | null;
  uptime?: { days30: PublicUptimeWindow; days90: PublicUptimeWindow };
  history?: PublicStatusHistoryDay[];
  /** True only after the complete authoritative history window has been read. */
  historyComplete?: boolean;
}

export interface PublicRegionStatus {
  name: string;
  status: PublicServiceStatus;
  totalServices: number;
  operationalServices: number;
  degradedServices: number;
  maintenanceServices: number;
  partialOutageServices: number;
  majorOutageServices: number;
  unknownServices: number;
  impactedServices: number;
  serviceIds: string[];
}

export type PublicIncidentStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'SNOOZED'
  | 'SUPPRESSED';
export type PublicIncidentUrgency = 'LOW' | 'MEDIUM' | 'HIGH';
export type PublicIncidentUpdateType =
  | 'INVESTIGATING'
  | 'IDENTIFIED'
  | 'MONITORING'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'UPDATE';

export interface PublicIncidentUpdate {
  id: string;
  type: PublicIncidentUpdateType;
  message: string;
  createdAt?: string;
}

export interface PublicIncident {
  id?: string;
  title?: string;
  description?: string;
  status: PublicIncidentStatus;
  urgency?: PublicIncidentUrgency;
  createdAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  service?: { id?: string; name?: string; regions?: string[] };
  updates?: PublicIncidentUpdate[];
  postIncidentReview?: boolean;
}

export interface PublicStatusPageSnapshot {
  schemaVersion: 3;
  pageId: string;
  revision: string;
  generatedAt: string;
  page: {
    id: string;
    name: string;
    organizationName?: string | null;
    timeZone: string;
    branding?: unknown;
    showSubscribe: boolean;
    showServicesByRegion: boolean;
    showRegionHeatmap: boolean;
    showPostIncidentReview: boolean;
    showChangelog: boolean;
    enableUptimeExports: boolean;
    footerText?: string | null;
    contactEmail?: string | null;
    contactUrl?: string | null;
    slug?: string | null;
    customDomain?: string | null;
    subdomain?: string | null;
    isDefault: boolean;
    requireAuth: boolean;
    enabled: boolean;
    statusApiRequireToken: boolean;
    statusApiRateLimitEnabled: boolean;
    statusApiRateLimitMax: number;
    statusApiRateLimitWindowSec: number;
  };
  status: PublicServiceStatus;
  services: PublicStatusService[];
  regions: PublicRegionStatus[];
  incidents: PublicIncident[];
  announcements: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    startDate: string;
    endDate: string | null;
  }>;
  historyDays: number;
}
