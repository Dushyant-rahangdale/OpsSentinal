import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Server-Sent Events (SSE) endpoint for real-time incident updates
 * 
 * GET /api/events/stream?incidentId=xxx
 * 
 * Streams real-time updates for:
 * - Incident status changes
 * - New incident events
 * - New notes
 * - Assignment changes
 * - Escalation updates
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const incidentId = searchParams.get('incidentId');
    const serviceId = searchParams.get('serviceId');
    const userId = session.user.id;

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Send initial connection message
            const send = (data: any) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            // Send connection confirmation
            send({ type: 'connected', timestamp: new Date().toISOString() });

            // Set up interval to check for updates
            const interval = setInterval(async () => {
                try {
                    const prisma = (await import('@/lib/prisma')).default;

                    if (incidentId) {
                        // Stream updates for a specific incident
                        const incident = await prisma.incident.findUnique({
                            where: { id: incidentId },
                            include: {
                                events: {
                                    orderBy: { createdAt: 'desc' },
                                    take: 1,
                                },
                                notes: {
                                    orderBy: { createdAt: 'desc' },
                                    take: 1,
                                },
                            },
                        });

                        if (incident) {
                            send({
                                type: 'incident_update',
                                incident: {
                                    id: incident.id,
                                    status: incident.status,
                                    urgency: incident.urgency,
                                    assigneeId: incident.assigneeId,
                                    nextEscalationAt: incident.nextEscalationAt,
                                    escalationStatus: incident.escalationStatus,
                                },
                                latestEvent: incident.events[0],
                                latestNote: incident.notes[0],
                            });
                        }
                    } else if (serviceId) {
                        // Stream updates for incidents in a service
                        const recentIncidents = await prisma.incident.findMany({
                            where: { serviceId },
                            orderBy: { updatedAt: 'desc' },
                            take: 10,
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                urgency: true,
                                updatedAt: true,
                            },
                        });

                        send({
                            type: 'service_incidents_update',
                            serviceId,
                            incidents: recentIncidents,
                        });
                    } else {
                        // Stream dashboard updates
                        const prisma = (await import('@/lib/prisma')).default;
                        
                        const [openCount, acknowledgedCount, resolvedCount] = await Promise.all([
                            prisma.incident.count({ where: { status: 'OPEN' } }),
                            prisma.incident.count({ where: { status: 'ACKNOWLEDGED' } }),
                            prisma.incident.count({ where: { status: 'RESOLVED' } }),
                        ]);

                        send({
                            type: 'dashboard_stats',
                            stats: {
                                open: openCount,
                                acknowledged: acknowledgedCount,
                                resolved: resolvedCount,
                            },
                        });
                    }
                } catch (error: any) {
                    send({ type: 'error', message: error.message });
                }
            }, 5000); // Check every 5 seconds

            // Cleanup on client disconnect
            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}





