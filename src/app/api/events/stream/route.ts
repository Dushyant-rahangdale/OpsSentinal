import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

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
    const session = await getServerSession(await getAuthOptions());
    
    if (!session?.user?.email) {
        return new Response('Unauthorized', { status: 401 });
    }

    const prisma = (await import('@/lib/prisma')).default;
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            id: true,
            role: true,
            teamMemberships: { select: { teamId: true } }
        }
    });

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const incidentId = searchParams.get('incidentId');
    const serviceId = searchParams.get('serviceId');

    const isPrivileged = user.role === 'ADMIN' || user.role === 'RESPONDER';
    const hasTeamAccess = (teamId?: string | null) => {
        if (!teamId) return true;
        if (isPrivileged) return true;
        return user.teamMemberships.some(membership => membership.teamId === teamId);
    };

    if (incidentId) {
        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
            select: { id: true, service: { select: { teamId: true } } }
        });

        if (!incident) {
            return new Response('Not Found', { status: 404 });
        }

        if (!hasTeamAccess(incident.service?.teamId || null)) {
            return new Response('Forbidden', { status: 403 });
        }
    }

    if (serviceId) {
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            select: { id: true, teamId: true }
        });

        if (!service) {
            return new Response('Not Found', { status: 404 });
        }

        if (!hasTeamAccess(service.teamId)) {
            return new Response('Forbidden', { status: 403 });
        }
    }

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







