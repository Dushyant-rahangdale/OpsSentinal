import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { assertAdmin } from '@/lib/rbac';
import { jsonError, jsonOk } from '@/lib/api-response';
import { StatusPageSettingsSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

/**
 * Update Status Page Settings
 * POST /api/settings/status-page
 */
export async function POST(req: NextRequest) {
    try {
        await assertAdmin();
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : 'Unauthorized', 403);
    }

    try {
        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return jsonError('Invalid JSON in request body.', 400);
        }
        const parsed = StatusPageSettingsSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
        }
        const {
            name,
            subdomain,
            customDomain,
            enabled,
            showServices,
            showIncidents,
            showMetrics,
            footerText,
            contactEmail,
            contactUrl,
            branding,
            serviceIds = [],
            serviceConfigs = {},
        } = parsed.data;

        // Get or create status page
        let statusPage = await prisma.statusPage.findFirst({});

        if (!statusPage) {
            statusPage = await prisma.statusPage.create({
                data: {
                    name: name || 'Status Page',
                    enabled: enabled !== false,
                    showServices: showServices !== false,
                    showIncidents: showIncidents !== false,
                    showMetrics: showMetrics !== false,
                },
            });
        }

        // Update status page
        const updateData: Prisma.StatusPageUpdateInput = {
            name,
            subdomain: subdomain || null,
            customDomain: customDomain || null,
            enabled: enabled !== false,
            showServices: showServices !== false,
            showIncidents: showIncidents !== false,
            showMetrics: showMetrics !== false,
            footerText: footerText || null,
            contactEmail: contactEmail || null,
            contactUrl: contactUrl || null
        };

        if (branding !== undefined) {
            updateData.branding = branding === null ? Prisma.JsonNull : (branding as Prisma.InputJsonValue);
        }

        await prisma.statusPage.update({
            where: { id: statusPage.id },
            data: updateData,
        });

        // Update services
        if (Array.isArray(serviceIds)) {
            // Delete existing services
            await prisma.statusPageService.deleteMany({
                where: { statusPageId: statusPage.id },
            });

            // Create new services with configurations
            if (serviceIds.length > 0) {
                await prisma.statusPageService.createMany({
                    data: serviceIds.map((serviceId: string) => {
                        const config = serviceConfigs[serviceId] || {};
                        return {
                            statusPageId: statusPage.id,
                            serviceId,
                            displayName: config.displayName || null,
                            order: config.order || 0,
                            showOnPage: config.showOnPage !== false,
                        };
                    }),
                });
            }
        }

        logger.info('api.status_page.updated', { statusPageId: statusPage.id });
        return jsonOk({ success: true }, 200);
    } catch (error: any) {
        logger.error('api.status_page.update_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to update status page', 500);
    }
}
