import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return jsonError('Unauthorized', 401);
        }

        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return jsonOk({ results: [] }, 200);
        }

        const searchTerm = query.trim();
        const searchTermLower = searchTerm.toLowerCase();

        // Enhanced search with full-text search support
        // For PostgreSQL, we can use full-text search for better results
        const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
        // Run all searches in parallel for better performance
        // Note: Postmortem search is wrapped to handle missing model gracefully
        const searchPromises: Promise<any>[] = [
            // Search incidents - Enhanced with multiple search strategies
            prisma.incident.findMany({
                where: {
                    OR: [
                        // Exact match (highest priority)
                        { title: { equals: searchTerm, mode: 'insensitive' } },
                        // Contains match
                        { title: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } },
                        // Word boundary matches (if multiple words)
                        ...(searchWords.length > 1 ? searchWords.map(word => ({
                            OR: [
                                { title: { contains: word, mode: 'insensitive' } },
                                { description: { contains: word, mode: 'insensitive' } }
                            ]
                        })) : []),
                        // ID search
                        { id: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                },
                take: 10, // Increased from 5
                orderBy: [
                    { createdAt: 'desc' }
                ],
                select: {
                    id: true,
                    title: true,
                    status: true,
                    urgency: true,
                    service: { select: { id: true, name: true } }
                }
            }),

            // Search services
            prisma.service.findMany({
                where: {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    team: { select: { id: true, name: true } }
                }
            }),

            // Search teams
            prisma.team.findMany({
                where: {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    description: true
                }
            }),

            // Search users
            prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { email: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            }),

            // Search escalation policies
            prisma.escalationPolicy.findMany({
                where: {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    description: true
                }
            }),

            // Search postmortems (only if Postmortem model exists)
            (async () => {
                try {
                    // Check if Postmortem model exists by checking if prisma has it
                    if (!prisma.postmortem) {
                        return [];
                    }
                    return await prisma.postmortem.findMany({
                        where: {
                            OR: [
                                { title: { contains: searchTerm, mode: 'insensitive' } },
                                { summary: { contains: searchTerm, mode: 'insensitive' } },
                                { rootCause: { contains: searchTerm, mode: 'insensitive' } },
                                { lessons: { contains: searchTerm, mode: 'insensitive' } }
                            ],
                            status: { not: 'ARCHIVED' } // Don't show archived postmortems
                        },
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true,
                            incidentId: true,
                            title: true,
                            status: true,
                            incident: {
                                select: {
                                    id: true,
                                    title: true
                                }
                            }
                        }
                    });
                } catch (e) {
                    // If postmortem model doesn't exist or query fails, return empty
                    return [];
                }
            })()
        ];

        const [incidents, services, teams, users, policies, postmortemsResult] = await Promise.all(searchPromises);

        // Handle postmortems result (unwrap promise if needed)
        const postmortems = Array.isArray(postmortemsResult) ? postmortemsResult : [];

        // Format results with proper priorities (incidents first, then services, etc.)
        const results = [
            ...incidents.map(i => ({
                type: 'incident' as const,
                id: i.id,
                title: i.title,
                subtitle: `${i.service?.name || 'No service'} - ${i.status}${i.urgency === 'HIGH' ? ' - High' : ''}`,
                href: `/incidents/${i.id}`,
                priority: i.urgency === 'HIGH' ? 1 : 2
            })),
            ...services.map(s => ({
                type: 'service' as const,
                id: s.id,
                title: s.name,
                subtitle: `${s.team?.name || 'No team'} - ${s.status || 'Active'}`,
                href: `/services/${s.id}`,
                priority: 3
            })),
            ...teams.map(t => ({
                type: 'team' as const,
                id: t.id,
                title: t.name,
                subtitle: t.description || 'Team',
                href: `/teams/${t.id}`,
                priority: 4
            })),
            ...users.map(u => ({
                type: 'user' as const,
                id: u.id,
                title: u.name || u.email,
                subtitle: u.email || `${u.role || 'User'}`,
                href: `/users?highlight=${u.id}`,
                priority: 5
            })),
            ...policies.map(p => ({
                type: 'policy' as const,
                id: p.id,
                title: p.name,
                subtitle: p.description || 'Escalation Policy',
                href: `/policies/${p.id}`,
                priority: 6
            })),
            ...postmortems.map((pm: any) => ({
                type: 'postmortem' as const,
                id: pm.id,
                title: pm.title,
                subtitle: `Postmortem for ${pm.incident.title} - ${pm.status}`,
                href: `/postmortems/${pm.incidentId}`,
                priority: 7
            }))
        ].sort((a, b) => {
            // Sort by priority first
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Then by relevance (exact matches first)
            const aExact = a.title.toLowerCase() === searchTermLower;
            const bExact = b.title.toLowerCase() === searchTermLower;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return 0;
        });

        return jsonOk({ results }, 200);
    } catch (error: any) {
        logger.error('api.search.error', { error: error instanceof Error ? error.message : String(error) });
        // Provide more detailed error information in development
        const errorMessage = process.env.NODE_ENV === 'development' 
            ? (error?.message || 'Search failed') 
            : 'Search failed. Please try again.';
        return jsonError(errorMessage, 500, {
            details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
    }
}
