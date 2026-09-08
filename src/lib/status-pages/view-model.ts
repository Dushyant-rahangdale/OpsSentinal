import type { StatusPageSnapshot } from './snapshot';

export type StatusPageSnapshotPage = {
  id: string;
  name: string;
  organizationName?: string | null;
  branding?: unknown;
  showSubscribe?: boolean;
  showServicesByRegion?: boolean;
  showRegionHeatmap?: boolean;
  showPostIncidentReview?: boolean;
  showChangelog?: boolean;
  enableUptimeExports?: boolean;
  footerText?: string | null;
  contactEmail?: string | null;
  contactUrl?: string | null;
  slug?: string | null;
  isDefault?: boolean;
};

export function createStatusPageViewModel(
  page: StatusPageSnapshotPage,
  snapshot: StatusPageSnapshot
) {
  const services = snapshot.services.map(service => ({
    ...service,
    _count: { incidents: service.activeIncidentCount ?? 0 },
  }));
  return {
    page,
    services,
    mappings: services.map((service, order) => ({
      id: `${page.id}:${service.id}`,
      serviceId: service.id,
      displayName: service.name,
      showOnPage: true,
      order,
    })),
    incidents: snapshot.incidents.map((incident, index) => {
      const service =
        incident.service && typeof incident.service === 'object' && !Array.isArray(incident.service)
          ? (incident.service as { name?: unknown; region?: unknown })
          : {};
      return {
        id: typeof incident.id === 'string' ? incident.id : `public-${index}`,
        title: typeof incident.title === 'string' ? incident.title : 'Status update',
        description: typeof incident.description === 'string' ? incident.description : null,
        status: typeof incident.status === 'string' ? incident.status : 'OPEN',
        urgency: typeof incident.urgency === 'string' ? incident.urgency : 'MEDIUM',
        createdAt:
          typeof incident.createdAt === 'string'
            ? new Date(incident.createdAt)
            : new Date(snapshot.generatedAt),
        resolvedAt: typeof incident.resolvedAt === 'string' ? new Date(incident.resolvedAt) : null,
        service: {
          id: '',
          name: typeof service.name === 'string' ? service.name : 'Service',
          region: typeof service.region === 'string' ? service.region : null,
        },
        events: [],
        postIncidentReview: incident.postIncidentReview === true,
      };
    }),
    announcements: snapshot.announcements.map(item => ({
      ...item,
      startDate: new Date(item.startDate),
      endDate: item.endDate ? new Date(item.endDate) : null,
    })),
    uptime: snapshot.uptime,
    uptime30: snapshot.uptime30 ?? snapshot.uptime,
    statusHistory: snapshot.statusHistory ?? {},
  };
}
