import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import { logger } from '@/lib/logger';

/**
 * Server-Sent Events endpoint for real-time notification updates
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
        return new Response('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, timeZone: true }
    });

    if (!user) {
        return new Response('User not found', { status: 404 });
    }

    const userTimeZone = getUserTimeZone(user ?? undefined);

    // Create a readable stream for SSE
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let isClosed = false;

            // Send initial connection message
            const send = (data: string) => {
                if (!isClosed) {
                    try {
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    } catch (error) {
                        logger.error('Error sending SSE data', { component: 'api-notifications-stream', error });
                        isClosed = true;
                    }
                }
            };

            send(JSON.stringify({ type: 'connected', message: 'Notification stream connected' }));

            // Poll for new notifications every 5 seconds (reduced from 2s to save DB)
            let lastCheck = new Date();
            let pollCount = 0;

            const pollInterval = setInterval(async () => {
                pollCount++;
                try {
                    // Optimized query: purely time-based, uses index [userId, createdAt]
                    // We check for ANY new notification regardless of read status to notify the user
                    const newNotifications = await prisma.inAppNotification.findMany({
                        where: {
                            userId: user.id,
                            createdAt: {
                                gt: lastCheck
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    });

                    let shouldUpdateUnreadCount = false;

                    if (newNotifications.length > 0) {
                        const formattedNotifications = newNotifications.map((notification) => {
                            const timeAgo = formatDateTime(notification.createdAt, userTimeZone, { format: 'relative' });
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

                        send(JSON.stringify({
                            type: 'notifications',
                            notifications: formattedNotifications,
                            count: formattedNotifications.length
                        }));

                        // Update last check time
                        lastCheck = newNotifications[0].createdAt;
                        shouldUpdateUnreadCount = true;
                    }

                    // Optimized Unread Count:
                    // Only check unread count if:
                    // 1. We found new notifications (count definitely changed)
                    // 2. OR: Every 5th poll (every 25s) to catch up on "mark as read" from other tabs/devices
                    if (shouldUpdateUnreadCount || pollCount % 5 === 0) {
                        const unreadCount = await prisma.inAppNotification.count({
                            where: {
                                userId: user.id,
                                readAt: null
                            }
                        });

                        send(JSON.stringify({
                            type: 'unread_count',
                            count: unreadCount
                        }));
                    }

                    send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
                } catch (error) {
                    logger.error('Error polling notifications', { component: 'api-notifications-stream', error });
                    send(JSON.stringify({
                        type: 'error',
                        message: 'Error fetching notifications'
                    }));
                }
            }, 5000);

            // Cleanup on client disconnect
            req.signal.addEventListener('abort', () => {
                isClosed = true;
                clearInterval(pollInterval);
                try {
                    controller.close();
                } catch (_error) {
                    // Controller already closed, ignore
                }
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

