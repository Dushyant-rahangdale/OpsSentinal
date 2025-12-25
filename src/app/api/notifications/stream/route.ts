import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

/**
 * Server-Sent Events endpoint for real-time notification updates
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
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

    const userTimeZone = getUserTimeZone(user);

    // Create a readable stream for SSE
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Send initial connection message
            const send = (data: string) => {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            send(JSON.stringify({ type: 'connected', message: 'Notification stream connected' }));

            // Poll for new notifications every 2 seconds
            let lastCheck = new Date();
            const pollInterval = setInterval(async () => {
                try {
                    const newNotifications = await prisma.inAppNotification.findMany({
                        where: {
                            userId: user.id,
                            createdAt: {
                                gt: lastCheck
                            },
                            readAt: null
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    });

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
                                unread: true,
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
                    }

                    // Also check unread count
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
                } catch (error) {
                    console.error('Error polling notifications:', error);
                    send(JSON.stringify({
                        type: 'error',
                        message: 'Error fetching notifications'
                    }));
                }
            }, 2000);

            // Cleanup on client disconnect
            req.signal.addEventListener('abort', () => {
                clearInterval(pollInterval);
                controller.close();
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

