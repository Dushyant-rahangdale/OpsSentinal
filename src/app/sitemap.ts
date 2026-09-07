import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { getAppUrl } from '@/lib/app-config';
import { logger } from '@/lib/logger';
import { getStatusPagePublicUrl } from '@/lib/status-page-url';

// Generate sitemap dynamically at runtime
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching

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
    const statusPages = await prisma.statusPage.findMany({
      where: { enabled: true, requireAuth: false, privacyMode: 'PUBLIC' },
      select: { slug: true, isDefault: true, customDomain: true, subdomain: true, updatedAt: true },
    });

    for (const statusPage of statusPages) {
      routes.push({
        url: getStatusPagePublicUrl(statusPage, baseUrl),
        lastModified: statusPage.updatedAt,
        changeFrequency: 'hourly',
        priority: 0.8,
      });
    }
  } catch (error) {
    // If database is not available, skip status page
    logger.error('Error fetching status page for sitemap', { component: 'sitemap', error });
  }

  return routes;
}
