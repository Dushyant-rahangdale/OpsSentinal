import prisma from '@/lib/prisma';
import Link from 'next/link';
import { MobileSearchWithParams } from '@/components/mobile/MobileSearchParams';

export const dynamic = 'force-dynamic';

export default async function MobileTeamsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const params = await searchParams;
    const query = params.q || '';

    const teams = await prisma.team.findMany({
        where: query ? {
            name: { contains: query, mode: 'insensitive' }
        } : undefined,
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: {
                    members: true,
                    incidents: { where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] } } },
                },
            },
        },
    });

    return (
        <div className="mobile-dashboard">
            {/* Header */}
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Teams</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {teams.length} team{teams.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Search */}
            <MobileSearchWithParams placeholder="Search teams..." />
            <div style={{ height: '0.75rem' }} />

            {/* Team List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {teams.length === 0 ? (
                    <EmptyState />
                ) : (
                    teams.map((team) => (
                        <Link
                            key={team.id}
                            href={`/m/teams/${team.id}`}
                            className="mobile-incident-card"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {/* Team Avatar */}
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    background: 'var(--gradient-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '1rem',
                                    flexShrink: 0,
                                }}>
                                    {team.name.charAt(0).toUpperCase()}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{team.name}</div>
                                    {team.description && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                                            {team.description}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        <span>👥 {team._count.members} member{team._count.members !== 1 ? 's' : ''}</span>
                                        {team._count.incidents > 0 && (
                                            <>
                                                <span>•</span>
                                                <span style={{ color: '#dc2626' }}>🔥 {team._count.incidents} open incident{team._count.incidents !== 1 ? 's' : ''}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>No teams</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Use desktop to create teams
            </p>
        </div>
    );
}
