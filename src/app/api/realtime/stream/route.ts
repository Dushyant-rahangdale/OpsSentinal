import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/rbac';
import { logger } from '@/lib/logger';

/**
 * Server-Sent Events (SSE) endpoint for real-time updates
 * Streams incident updates, dashboard metrics, and service status changes
 */
export async function GET(req: NextRequest) {
    try {
        // Get current user for authorization
        const user = await getCurrentUser();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        // Create a readable stream for SSE
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                // Send initial connection message
                const send = (data: string) => {
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                };

                // Send initial connection confirmation
                send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));

                // Set up polling interval (every 5 seconds)
                const pollInterval = setInterval(async () => {
                    try {
                        // Get recent incident updates (last 10 seconds)
                        const tenSecondsAgo = new Date(Date.now() - 10000);
                        const recentIncidents = await prisma.incident.findMany({
                            where: {
                                updatedAt: { gte: tenSecondsAgo },
                                OR: [
                                    { assigneeId: user.id },
                                    { service: { team: { members: { some: { userId: user.id } } } } },
                                    ...(user.role === 'ADMIN' || user.role === 'RESPONDER' ? [{}] : [])
                                ]
                            },
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                urgency: true,
                                updatedAt: true,
                                service: { select: { id: true, name: true } }
                            },
                            take: 50,
                            orderBy: { updatedAt: 'desc' }
                        });

                        if (recentIncidents.length > 0) {
                            send(JSON.stringify({
                                type: 'incidents_updated',
                                incidents: recentIncidents,
                                timestamp: new Date().toISOString()
                            }));
                        }

                        // Get dashboard metrics
                        const [openCount, acknowledgedCount, resolvedCount, highUrgencyCount] = await Promise.all([
                            prisma.incident.count({ where: { status: 'OPEN' } }),
                            prisma.incident.count({ where: { status: 'ACKNOWLEDGED' } }),
                            prisma.incident.count({ where: { status: 'RESOLVED', resolvedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
                            prisma.incident.count({ where: { status: { not: 'RESOLVED' }, urgency: 'HIGH' } })
                        ]);

                        send(JSON.stringify({
                            type: 'metrics_updated',
                            metrics: {
                                open: openCount,
                                acknowledged: acknowledgedCount,
                                resolved24h: resolvedCount,
                                highUrgency: highUrgencyCount
                            },
                            timestamp: new Date().toISOString()
                        }));

                        // Send heartbeat to keep connection alive
                        send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
                    } catch (error) {
                        logger.error('SSE polling error', { component: 'api-realtime-stream', error });
                        send(JSON.stringify({
                            type: 'error',
                            message: 'Failed to fetch updates',
                            timestamp: new Date().toISOString()
                        }));
                    }
                }, 5000); // Poll every 5 seconds

                // Clean up on client disconnect
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
                'X-Accel-Buffering': 'no' // Disable nginx buffering
            }
        });
    } catch (error) {
        logger.error('SSE stream error', { component: 'api-realtime-stream', error });
        return new Response('Internal Server Error', { status: 500 });
    }
}

