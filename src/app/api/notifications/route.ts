import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { NotificationPatchSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return jsonError('Unauthorized', 401);
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) {
            return jsonError('User not found', 404);
        }

        const { searchParams } = new URL(req.url);
        const limit = parseLimit(searchParams.get('limit'));
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const baseWhere = {
            userId: user.id
        };

        const where = unreadOnly
            ? { ...baseWhere, readAt: null }
            : baseWhere;

        const [notifications, unreadCount, total] = await Promise.all([
            prisma.inAppNotification.findMany({
                where,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.inAppNotification.count({
                where: { ...baseWhere, readAt: null }
            }),
            prisma.inAppNotification.count({
                where: baseWhere
            })
        ]);

        const formattedNotifications = notifications.map((notification) => {
            const timeAgo = getTimeAgo(notification.createdAt);
            const typeKey = notification.type.toLowerCase();
            const typeMap: Record<string, 'incident' | 'service' | 'schedule'> = {
                incident: 'incident',
                schedule: 'schedule',
                service: 'service',
                team: 'service'
            };
            const type = typeMap[typeKey] || 'incident';
            const incidentId = notification.entityType === 'INCIDENT'
                ? notification.entityId
                : null;

            return {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                time: timeAgo,
                unread: !notification.readAt,
                type,
                incidentId,
                createdAt: notification.createdAt.toISOString()
            };
        });

        return jsonOk({ notifications: formattedNotifications, unreadCount, total }, 200);
    } catch (error) {
        logger.error('api.notifications.fetch_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError('Failed to fetch notifications', 500);
    }
}

function parseLimit(value: string | null) {
    const limit = Number(value);
    if (Number.isNaN(limit) || limit <= 0) return 50;
    return Math.min(limit, 200);
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return jsonError('Unauthorized', 401);
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) {
            return jsonError('User not found', 404);
        }

        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return jsonError('Invalid JSON in request body.', 400);
        }
        const parsed = NotificationPatchSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
        }
        const { notificationIds, markAllAsRead } = parsed.data;

        if (markAllAsRead) {
            await prisma.inAppNotification.updateMany({
                where: {
                    userId: user.id,
                    readAt: null
                },
                data: {
                    readAt: new Date()
                }
            });

            return jsonOk({ success: true, message: 'All notifications marked as read' }, 200);
        }

        if (notificationIds && Array.isArray(notificationIds)) {
            await prisma.inAppNotification.updateMany({
                where: {
                    id: { in: notificationIds },
                    userId: user.id
                },
                data: {
                    readAt: new Date()
                }
            });

            return jsonOk({ success: true, message: 'Notifications marked as read' }, 200);
        }

        return jsonError('Invalid request', 400);
    } catch (error) {
        logger.error('api.notifications.update_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError('Failed to update notifications', 500);
    }
}

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
}


