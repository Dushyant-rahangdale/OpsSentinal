import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * Status Page API
 * Returns JSON data for status page integrations
 * 
 * GET /api/status
 */
export async function GET() {
    try {
        const statusPage = await prisma.statusPage.findFirst({
            where: { enabled: true },
            include: {
                services: {
                    include: {
                        service: true,
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!statusPage) {
            return jsonError('Status page not found or disabled', 404);
        }

        const serviceIds = statusPage.services
            .filter(sp => sp.showOnPage)
            .map(sp => sp.serviceId);

        const effectiveServiceIds = serviceIds.length > 0
            ? serviceIds
            : (await prisma.service.findMany({ select: { id: true } })).map(s => s.id);

        const services = await prisma.service.findMany({
            where: { id: { in: effectiveServiceIds } },
            include: {
                _count: {
                    select: {
                        incidents: {
                            where: {
                                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                            },
                        },
                    },
                },
            },
        });

        const activeIncidents = await prisma.incident.findMany({
            where: {
                serviceId: { in: effectiveServiceIds },
                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
            },
            select: {
                serviceId: true,
                urgency: true,
                createdAt: true,
                resolvedAt: true,
                status: true,
            },
        });

        const incidentsByService = activeIncidents.reduce((acc, incident) => {
            if (!acc[incident.serviceId]) {
                acc[incident.serviceId] = [];
            }
            acc[incident.serviceId].push(incident);
            return acc;
        }, {} as Record<string, typeof activeIncidents>);

        const serviceStatusMap = new Map<string, string>();
        services.forEach((service) => {
            const incidents = incidentsByService[service.id] || [];
            const hasHigh = incidents.some((inc) => inc.urgency === 'HIGH');
            const hasLow = incidents.some((inc) => inc.urgency === 'LOW');
            const status = hasHigh ? 'MAJOR_OUTAGE' : hasLow ? 'PARTIAL_OUTAGE' : 'OPERATIONAL';
            serviceStatusMap.set(service.id, status);
        });

        // Calculate overall status
        const hasOutage = activeIncidents.some(inc => inc.urgency === 'HIGH');
        const hasDegraded = activeIncidents.some(inc => inc.urgency === 'LOW');
        const overallStatus = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

        // Get recent incidents
        const recentIncidents = await prisma.incident.findMany({
            where: {
                serviceId: { in: effectiveServiceIds },
                createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            include: {
                service: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        const servicesData = services.map(service => ({
            id: service.id,
            name: service.name,
            status: serviceStatusMap.get(service.id) || service.status,
            activeIncidents: service._count.incidents,
        }));

        // Calculate uptime metrics (30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const allIncidents = await prisma.incident.findMany({
            where: {
                serviceId: { in: effectiveServiceIds },
                OR: [
                    { createdAt: { gte: thirtyDaysAgo } },
                    { resolvedAt: { gte: thirtyDaysAgo } },
                    { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
                ],
            },
            select: {
                id: true,
                serviceId: true,
                createdAt: true,
                resolvedAt: true,
                status: true,
            },
        });

        const uptimeMetrics = services.map(service => {
            const serviceIncidents = allIncidents.filter(inc => inc.serviceId === service.id);
            const periodEnd = new Date();
            const totalMinutes = (periodEnd.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60);
            let downtimeMinutes = 0;
            
            serviceIncidents.forEach(incident => {
                if (incident.status === 'SUPPRESSED' || incident.status === 'SNOOZED') {
                    return;
                }

                const incidentStart = incident.createdAt > thirtyDaysAgo ? incident.createdAt : thirtyDaysAgo;
                const incidentEnd = (incident.resolvedAt || periodEnd) < periodEnd
                    ? (incident.resolvedAt || periodEnd)
                    : periodEnd;
                const incidentMinutes = (incidentEnd.getTime() - incidentStart.getTime()) / (1000 * 60);
                if (incidentMinutes > 0) {
                    downtimeMinutes += incidentMinutes;
                }
            });

            const uptimePercent = totalMinutes > 0 ? ((totalMinutes - downtimeMinutes) / totalMinutes) * 100 : 100;

            return {
                serviceId: service.id,
                uptime: parseFloat(uptimePercent.toFixed(3)),
            };
        });

        return jsonOk({
            status: overallStatus,
            services: servicesData,
            incidents: recentIncidents.map(inc => ({
                id: inc.id,
                title: inc.title,
                status: inc.status,
                service: inc.service.name,
                createdAt: inc.createdAt.toISOString(),
                resolvedAt: inc.resolvedAt?.toISOString() || null,
            })),
            metrics: {
                uptime: uptimeMetrics,
            },
            updatedAt: new Date().toISOString(),
        }, 200);
    } catch (error: any) {
        logger.error('api.status.error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError('Failed to fetch status', 500);
    }
}
