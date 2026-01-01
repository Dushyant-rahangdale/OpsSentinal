import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

export async function GET() {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session?.user?.email) {
            return jsonError('Unauthorized', 401);
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: {
                id: true,
                role: true,
                teamMemberships: { select: { teamId: true } }
            }
        });

        if (!user) {
            return jsonError('Unauthorized', 401);
        }

        const where: Prisma.IncidentWhereInput = {
            status: { in: ['OPEN', 'ACKNOWLEDGED'] }
        };

        if (user.role !== 'ADMIN' && user.role !== 'RESPONDER') {
            const teamIds = user.teamMemberships.map((membership) => membership.teamId);
            where.OR = [
                { assigneeId: user.id },
                { service: { teamId: { in: teamIds } } }
            ];
        }

        const activeIncidentsCount = await prisma.incident.count({ where });

        return jsonOk({ activeIncidentsCount }, 200);
    } catch (error) {
        logger.error('api.sidebar_stats.error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError('Failed to fetch stats', 500);
    }
}










