import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return jsonError('Unauthorized', 401);
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, timeZone: true }
        });

        if (!user) {
            return jsonError('User not found', 404);
        }

        const userTimeZone = getUserTimeZone(user);

        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
        const offset = parseInt(searchParams.get('offset') || '0');
        const channel = searchParams.get('channel');
        const status = searchParams.get('status');

        const where: any = {
            userId: user.id
        };

        if (channel) {
            where.channel = channel;
        }

        if (status) {
            where.status = status;
        }

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' },
                include: {
                    incident: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            urgency: true
                        }
                    }
                }
            }),
            prisma.notification.count({ where })
        ]);

        const formattedNotifications = notifications.map((notification) => ({
            id: notification.id,
            channel: notification.channel,
            status: notification.status,
            message: notification.message,
            incident: notification.incident ? {
                id: notification.incident.id,
                title: notification.incident.title,
                status: notification.incident.status,
                urgency: notification.incident.urgency
            } : null,
            sentAt: notification.sentAt ? formatDateTime(notification.sentAt, userTimeZone, { format: 'datetime' }) : null,
            deliveredAt: notification.deliveredAt ? formatDateTime(notification.deliveredAt, userTimeZone, { format: 'datetime' }) : null,
            failedAt: notification.failedAt ? formatDateTime(notification.failedAt, userTimeZone, { format: 'datetime' }) : null,
            errorMsg: notification.errorMsg,
            createdAt: formatDateTime(notification.createdAt, userTimeZone, { format: 'datetime' })
        }));

        return jsonOk({
            notifications: formattedNotifications,
            total,
            limit,
            offset
        }, 200);
    } catch (error) {
        logger.error('api.notifications.history.fetch_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError('Failed to fetch notification history', 500);
    }
}

