import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json({ results: [] });
        }

        const searchTerm = query.toLowerCase();

        // Search incidents
        const incidents = await prisma.incident.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                title: true,
                status: true,
                service: { select: { name: true } }
            }
        });

        // Search services
        const services = await prisma.service.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                name: true,
                team: { select: { name: true } }
            }
        });

        // Search teams
        const teams = await prisma.team.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                name: true
            }
        });

        // Search users
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        // Search escalation policies
        const policies = await prisma.escalationPolicy.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                name: true
            }
        });

        const results = [
            ...incidents.map(i => ({
                type: 'incident' as const,
                id: i.id,
                title: i.title,
                subtitle: `${i.service.name} • ${i.status}`,
                href: `/incidents/${i.id}`
            })),
            ...services.map(s => ({
                type: 'service' as const,
                id: s.id,
                title: s.name,
                subtitle: s.team?.name || 'No team',
                href: `/services/${s.id}`
            })),
            ...teams.map(t => ({
                type: 'team' as const,
                id: t.id,
                title: t.name,
                subtitle: 'Team',
                href: `/teams/${t.id}`
            })),
            ...users.map(u => ({
                type: 'user' as const,
                id: u.id,
                title: u.name,
                subtitle: u.email,
                href: `/users`
            })),
            ...policies.map(p => ({
                type: 'policy' as const,
                id: p.id,
                title: p.name,
                subtitle: 'Escalation Policy',
                href: `/policies/${p.id}`
            }))
        ];

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

