import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertAdmin } from '@/lib/rbac';

/**
 * Update Status Page Settings
 * POST /api/settings/status-page
 */
export async function POST(req: NextRequest) {
    try {
        await assertAdmin();
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unauthorized' },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();
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
        } = body;

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
        await prisma.statusPage.update({
            where: { id: statusPage.id },
            data: {
                name,
                subdomain: subdomain || null,
                customDomain: customDomain || null,
                enabled: enabled !== false,
                showServices: showServices !== false,
                showIncidents: showIncidents !== false,
                showMetrics: showMetrics !== false,
                footerText: footerText || null,
                contactEmail: contactEmail || null,
                contactUrl: contactUrl || null,
                branding: branding || null,
            },
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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Status page update error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update status page' },
            { status: 500 }
        );
    }
}
