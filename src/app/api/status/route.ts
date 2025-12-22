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

        const servicesData = services.map(service => ({
            id: service.id,
            name: service.name,
            status: service.status,
            activeIncidents: service._count.incidents,
        }));

        return NextResponse.json({
            status: overallStatus,
            services: servicesData,
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

