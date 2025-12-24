import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * RSS Feed for Status Page
 * GET /api/status/rss
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
                    where: { showOnPage: true },
                },
            },
        });

        if (!statusPage) {
            return new NextResponse('Status page not found', { status: 404 });
        }

        const serviceIds = statusPage.services.map(sp => sp.serviceId);
        const effectiveServiceIds = serviceIds.length > 0
            ? serviceIds
            : (await prisma.service.findMany({ select: { id: true } })).map(s => s.id);

        // Get recent incidents (last 30 days)
        const incidents = await prisma.incident.findMany({
            where: {
                serviceId: { in: effectiveServiceIds },
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
            include: {
                service: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        // Generate RSS XML
        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${statusPage.name} - Status Updates</title>
        <link>${process.env.NEXT_PUBLIC_APP_URL || 'https://status.example.com'}/status</link>
        <description>Status updates and incident reports for ${statusPage.name}</description>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${process.env.NEXT_PUBLIC_APP_URL || 'https://status.example.com'}/api/status/rss" rel="self" type="application/rss+xml" />
        ${incidents.map(incident => {
            const status = incident.status === 'RESOLVED' ? 'Resolved' : 
                          incident.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 
                          'Investigating';
            const pubDate = new Date(incident.createdAt).toUTCString();
            const guid = `${process.env.NEXT_PUBLIC_APP_URL || 'https://status.example.com'}/status#incident-${incident.id}`;
            
            return `
        <item>
            <title>${escapeXml(incident.title)} - ${status}</title>
            <link>${guid}</link>
            <guid isPermaLink="false">${guid}</guid>
            <pubDate>${pubDate}</pubDate>
            <description>${escapeXml(incident.description || incident.title)} - Service: ${escapeXml(incident.service.name)}</description>
            <category>${escapeXml(incident.service.name)}</category>
        </item>`;
        }).join('')}
    </channel>
</rss>`;

        return new NextResponse(rss, {
            headers: {
                'Content-Type': 'application/rss+xml; charset=utf-8',
            },
        });
    } catch (error: any) {
        logger.error('api.status.rss_error', { error: error instanceof Error ? error.message : String(error) });
        return new NextResponse('Failed to generate RSS feed', { status: 500 });
    }
}

function escapeXml(unsafe: string | null): string {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}







