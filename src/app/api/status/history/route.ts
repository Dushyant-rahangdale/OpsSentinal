import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * Get Status Page Historical Data
 * GET /api/status/history?serviceId=xxx&days=90
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get('serviceId');
        const daysParam = searchParams.get('days');
        const days = daysParam ? parseInt(daysParam) : 90;

        const statusPage = await prisma.statusPage.findFirst({
            where: { enabled: true },
            include: {
                services: {
                    include: {
                        service: true,
                    },
                },
            },
        });

        if (!statusPage) {
            return jsonError('Status page not found or disabled', 404);
        }

        const serviceIds = statusPage.services
            .filter((sp) => sp.showOnPage)
            .map((sp) => sp.serviceId);

        const effectiveServiceIds = serviceIds.length > 0
            ? (serviceId && serviceIds.includes(serviceId) ? [serviceId] : serviceIds)
            : (serviceId ? [serviceId] : []);

        if (effectiveServiceIds.length === 0) {
            return jsonOk({ incidents: [], services: [] }, 200);
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const incidents = await prisma.incident.findMany({
            where: {
                serviceId: { in: effectiveServiceIds },
                OR: [
                    { createdAt: { gte: startDate } },
                    { resolvedAt: { gte: startDate } },
                    { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
                ],
            },
            include: {
                service: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const services = await prisma.service.findMany({
            where: { id: { in: effectiveServiceIds } },
            select: {
                id: true,
                name: true,
            },
        });

        return jsonOk({
            incidents: incidents.map((inc) => ({
                id: inc.id,
                title: inc.title,
                status: inc.status,
                urgency: inc.urgency,
                service: {
                    id: inc.service.id,
                    name: inc.service.name,
                },
                createdAt: inc.createdAt.toISOString(),
                resolvedAt: inc.resolvedAt?.toISOString() || null,
            })),
            services,
            period: {
                days,
                startDate: startDate.toISOString(),
                endDate: new Date().toISOString(),
            },
        }, 200);
    } catch (error: any) {
        logger.error('api.status.history.error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to fetch history', 500);
    }
}

