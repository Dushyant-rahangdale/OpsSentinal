import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import type { IncidentStatus, IncidentUrgency } from '@prisma/client';

const INSENSITIVE_MODE = 'insensitive' as const;

type IncidentWithService = {
  id: string;
  title: string;
  status: IncidentStatus;
  urgency: IncidentUrgency;
  service?: {
    id: string;
    name: string;
  } | null;
};

type ServiceWithTeam = {
  id: string;
  name: string;
  status?: string | null;
  team?: {
    id: string;
    name: string;
  } | null;
};

type TeamSearchResult = {
  id: string;
  name: string;
  description?: string | null;
};

type UserSearchResult = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
};

type PolicySearchResult = {
  id: string;
  name: string;
  description?: string | null;
};

type PostmortemSearchResult = {
  id: string;
  incidentId: string;
  title: string;
  status: string;
  incident?: {
    id: string;
    title: string;
  } | null;
};

type SearchResponses = [
  IncidentWithService[],
  ServiceWithTeam[],
  TeamSearchResult[],
  UserSearchResult[],
  PolicySearchResult[],
  PostmortemSearchResult[] | [],
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(await getAuthOptions());
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
    const searchPromises = [
      // Search incidents - Enhanced with multiple search strategies
      prisma.incident.findMany({
        where: {
          OR: [
            // Exact match (highest priority)
            { title: { equals: searchTerm, mode: INSENSITIVE_MODE } },
            // Contains match
            { title: { contains: searchTerm, mode: INSENSITIVE_MODE } },
            { description: { contains: searchTerm, mode: INSENSITIVE_MODE } },
            // Word boundary matches (if multiple words)
            ...(searchWords.length > 1
              ? searchWords.map(word => ({
                  OR: [
                    { title: { contains: word, mode: INSENSITIVE_MODE } },
                    { description: { contains: word, mode: INSENSITIVE_MODE } },
                  ],
                }))
              : []),
            // ID search
            { id: { contains: searchTerm, mode: INSENSITIVE_MODE } },
          ],
        },
        take: 10, // Increased from 5
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          status: true,
          urgency: true,
          service: { select: { id: true, name: true } },
        },
      }),

      // Search services
      prisma.service.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: INSENSITIVE_MODE } },
            { description: { contains: searchTerm, mode: INSENSITIVE_MODE } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          team: { select: { id: true, name: true } },
        },
      }),

      // Search teams
      prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: INSENSITIVE_MODE } },
            { description: { contains: searchTerm, mode: INSENSITIVE_MODE } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
        },
      }),

      // Search users
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: INSENSITIVE_MODE } },
            { email: { contains: searchTerm, mode: INSENSITIVE_MODE } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          gender: true,
        },
      }),

      // Search escalation policies
      prisma.escalationPolicy.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: INSENSITIVE_MODE } },
            { description: { contains: searchTerm, mode: INSENSITIVE_MODE } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
        },
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
                { title: { contains: searchTerm, mode: INSENSITIVE_MODE } },
                { summary: { contains: searchTerm, mode: INSENSITIVE_MODE } },
                { rootCause: { contains: searchTerm, mode: INSENSITIVE_MODE } },
                { lessons: { contains: searchTerm, mode: INSENSITIVE_MODE } },
              ],
              status: { not: 'ARCHIVED' }, // Don't show archived postmortems
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
                  title: true,
                },
              },
            },
          });
        } catch (_e) {
          // If postmortem model doesn't exist or query fails, return empty
          return [];
        }
      })(),
    ];

    const [incidents, services, teams, users, policies, postmortemsResult] = (await Promise.all(
      searchPromises
    )) as SearchResponses;

    // Handle postmortems result (unwrap promise if needed)
    const postmortems = Array.isArray(postmortemsResult) ? postmortemsResult : [];

    // Format results with proper priorities (incidents first, then services, etc.)
    const results = [
      ...incidents.map(i => {
        const urgencyLabel =
          i.urgency === 'HIGH' ? 'High' : i.urgency === 'MEDIUM' ? 'Medium' : 'Low';
        const urgencyPriority = i.urgency === 'HIGH' ? 1 : i.urgency === 'MEDIUM' ? 2 : 3;
        return {
          type: 'incident' as const,
          id: i.id,
          title: i.title,
          subtitle: `${i.service?.name || 'No service'} - ${i.status} - ${urgencyLabel}`,
          href: `/incidents/${i.id}`,
          priority: urgencyPriority,
        };
      }),
      ...services.map(s => ({
        type: 'service' as const,
        id: s.id,
        title: s.name,
        subtitle: `${s.team?.name || 'No team'} - ${s.status || 'Active'}`,
        href: `/services/${s.id}`,
        priority: 4,
      })),
      ...teams.map(t => ({
        type: 'team' as const,
        id: t.id,
        title: t.name,
        subtitle: t.description || 'Team',
        href: `/teams/${t.id}`,
        priority: 5,
      })),
      ...users.map(u => ({
        type: 'user' as const,
        id: u.id,
        title: u.name || u.email,
        subtitle: u.email || `${u.role || 'User'}`,
        href: `/users?highlight=${u.id}`,
        priority: 6,
        avatarUrl: u.avatarUrl,
        gender: u.gender,
      })),
      ...policies.map(p => ({
        type: 'policy' as const,
        id: p.id,
        title: p.name,
        subtitle: p.description || 'Escalation Policy',
        href: `/policies/${p.id}`,
        priority: 7,
      })),
      ...postmortems.map((pm: any) => ({
        type: 'postmortem' as const,
        id: pm.id,
        title: pm.title,
        subtitle: `Postmortem for ${pm.incident.title} - ${pm.status}`,
        href: `/postmortems/${pm.incidentId}`,
        priority: 8,
      })),
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
    logger.error('api.search.error', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Provide more detailed error information in development
    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? error?.message || 'Search failed'
        : 'Search failed. Please try again.';
    return jsonError(errorMessage, 500, {
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
}
