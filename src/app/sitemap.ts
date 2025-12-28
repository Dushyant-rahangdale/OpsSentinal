import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = await getAppUrl();
    const routes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
    ];

    // Add status page if enabled
    try {
        const statusPage = await prisma.statusPage.findFirst({
            where: { enabled: true },
        });

        if (statusPage) {
            routes.push({
                url: `${baseUrl}/status`,
                lastModified: statusPage.updatedAt,
                changeFrequency: 'hourly',
                priority: 0.8,
            });
        }
    } catch (error) {
        // If database is not available, skip status page
        console.error('Error fetching status page for sitemap:', error);
    }

    return routes;
}

