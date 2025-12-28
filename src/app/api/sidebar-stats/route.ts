import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session) {
            return jsonError('Unauthorized', 401);
        }

        const activeIncidentsCount = await prisma.incident.count({
            where: {
                status: { not: 'RESOLVED' }
            }
        });

        return jsonOk({ activeIncidentsCount }, 200);
    } catch (error) {
        logger.error('api.sidebar_stats.error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError('Failed to fetch stats', 500);
    }
}










