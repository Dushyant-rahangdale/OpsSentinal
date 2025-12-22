import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
            return NextResponse.json(
                { error: 'Status page not found or disabled' },
                { status: 404 }
            );
        }

        const serviceIds = statusPage.services
            .filter(sp => sp.showOnPage)
            .map(sp => sp.serviceId);

        const services = await prisma.service.findMany({
            where: { id: { in: serviceIds } },
            include: {
                _count: {
                    select: {
                        incidents: {
                            where: {
                                status: { not: 'RESOLVED' },
                            },
                        },
                    },
                },
            },
        });

        // Calculate overall status
        const hasOutage = services.some(s => s.status === 'MAJOR_OUTAGE' || s.status === 'PARTIAL_OUTAGE');
        const hasDegraded = services.some(s => s.status === 'DEGRADED');
        const overallStatus = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

        // Get recent incidents
        const recentIncidents = await prisma.incident.findMany({
            where: {
                serviceId: { in: serviceIds },
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
            status: service.status,
            activeIncidents: service._count.incidents,
        }));

        // Calculate uptime metrics (30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const allIncidents = await prisma.incident.findMany({
            where: {
                serviceId: { in: serviceIds },
                createdAt: { gte: thirtyDaysAgo },
            },
            select: {
                id: true,
                serviceId: true,
                createdAt: true,
                resolvedAt: true,
            },
        });

        const uptimeMetrics = services.map(service => {
            const serviceIncidents = allIncidents.filter(inc => inc.serviceId === service.id);
            const totalMinutes = 30 * 24 * 60;
            let downtimeMinutes = 0;
            
            serviceIncidents.forEach(incident => {
                const start = incident.createdAt;
                const end = incident.resolvedAt || new Date();
                const incidentMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                downtimeMinutes += Math.min(incidentMinutes, totalMinutes);
            });

            const uptimePercent = totalMinutes > 0 ? ((totalMinutes - downtimeMinutes) / totalMinutes) * 100 : 100;

            return {
                serviceId: service.id,
                uptime: parseFloat(uptimePercent.toFixed(3)),
            };
        });

        return NextResponse.json({
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
        });
    } catch (error: any) {
        console.error('Status API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch status' },
            { status: 500 }
        );
    }
}

