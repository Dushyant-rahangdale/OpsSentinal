import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';

/**
 * Update Status Page Settings
 * POST /api/settings/status-page
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertAdmin();

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
            serviceIds,
        } = body;

        // Get or create status page
        let statusPage = await prisma.statusPage.findFirst({
            where: { enabled: true },
        });

        if (!statusPage) {
            statusPage = await prisma.statusPage.create({
                data: {
                    name: name || 'Status Page',
                    enabled: enabled ?? true,
                    showServices: showServices ?? true,
                    showIncidents: showIncidents ?? true,
                    showMetrics: showMetrics ?? true,
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
                enabled,
                showServices,
                showIncidents,
                showMetrics,
                footerText: footerText || null,
                contactEmail: contactEmail || null,
                contactUrl: contactUrl || null,
            },
        });

        // Update services
        if (Array.isArray(serviceIds)) {
            // Remove all existing service associations
            await prisma.statusPageService.deleteMany({
                where: { statusPageId: statusPage.id },
            });

            // Add new service associations
            if (serviceIds.length > 0) {
                await prisma.statusPageService.createMany({
                    data: serviceIds.map((serviceId: string, index: number) => ({
                        statusPageId: statusPage.id,
                        serviceId,
                        showOnPage: true,
                        order: index,
                    })),
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

