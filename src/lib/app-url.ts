import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Get the application base URL
 * Priority:
 * 1. Database configuration (SystemSettings.appUrl)
 * 2. Environment variable (NEXT_PUBLIC_APP_URL)
 * 3. Fallback to localhost (development only)
 */
export async function getAppUrl(): Promise<string> {
    try {
        // Try to get from database first
        const settings = await prisma.systemSettings.findUnique({
            where: { id: 'default' },
            select: { appUrl: true }
        });

        if (settings?.appUrl) {
            return settings.appUrl;
        }
    } catch (error) {
        // If database query fails, log and continue to fallback
        logger.warn('Failed to fetch app URL from database', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    // Fallback to environment variable
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }

    // Final fallback for development
    const fallback = 'http://localhost:3000';

    if (process.env.NODE_ENV === 'production') {
        logger.warn('App URL not configured in database or environment. Using fallback which may cause issues with notifications and webhooks.');
    }

    return fallback;
}

/**
 * Get the application base URL synchronously (for client-side)
 * Only use this on the server side or when you can't use async
 */
export function getAppUrlSync(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
