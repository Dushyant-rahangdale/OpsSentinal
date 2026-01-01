import prisma from '@/lib/prisma';
import Link from 'next/link';
import { MobileEmptyState } from '@/components/mobile/MobileUtils';
import { MobileSearchWithParams, MobileFilterWithParams } from '@/components/mobile/MobileSearchParams';
import { IncidentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

type Incident = {
    id: string;
    title: string;
    status: string;
    urgency: string | null;
    createdAt: Date;
    service: { name: string };
    assignee: { name: string | null } | null;
};

export default async function MobileIncidentsPage(props: {
    searchParams?: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams?.q || '';
    const filter = searchParams?.filter || 'all';
    const page = Math.max(1, parseInt(searchParams?.page || '1', 10));

    const where: any = {};

    // Search filter
    if (query) {
        where.title = { contains: query, mode: 'insensitive' };
    }

    // Status filter
    if (filter === 'open') {
        where.status = { not: 'RESOLVED' };
    } else if (filter === 'resolved') {
        where.status = 'RESOLVED';
    }

    const [incidents, totalCount] = await Promise.all([
        prisma.incident.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            select: {
                id: true,
                title: true,
                status: true,
                urgency: true,
                createdAt: true,
                service: { select: { name: true } },
                assignee: { select: { name: true } },
            },
        }),
        prisma.incident.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const startIndex = (page - 1) * PAGE_SIZE + 1;
    const endIndex = Math.min(page * PAGE_SIZE, totalCount);

    // Build pagination URLs
    const buildPageUrl = (newPage: number) => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (filter && filter !== 'all') params.set('filter', filter);
        params.set('page', newPage.toString());
        return `/m/incidents?${params.toString()}`;
    };

    return (
        <div className="mobile-dashboard">
            {/* Header Stats */}
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Incidents</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {totalCount > 0 ? `${startIndex}-${endIndex} of ${totalCount}` : '0 incidents'}
                </p>
            </div>

            {/* Search and Filter */}
            <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <MobileSearchWithParams placeholder="Search incidents..." />

                <MobileFilterWithParams
                    filters={[
                        { label: 'All', value: 'all' },
                        { label: 'Open', value: 'open' },
                        { label: 'Resolved', value: 'resolved' },
                    ]}
                />
            </div>

            {/* Create Button */}
            <Link
                href="/m/incidents/create"
                className="mobile-quick-action"
                style={{ marginBottom: '1rem', display: 'flex' }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
                </svg>
                Create Incident
            </Link>

            {/* Incident List */}
            <div className="mobile-incident-list">
                {incidents.length === 0 ? (
                    <MobileEmptyState
                        icon="🔍"
                        title="No incidents found"
                        description={query ? `No match for "${query}"` : "Change filters or create a new one"}
                    />
                ) : (
                    incidents.map((incident) => (
                        <IncidentCard key={incident.id} incident={incident} />
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)'
                }}>
                    {page > 1 ? (
                        <Link
                            href={buildPageUrl(page - 1)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.5rem 1rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontWeight: '600'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Prev
                        </Link>
                    ) : <div />}

                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Page {page} of {totalPages}
                    </span>

                    {page < totalPages ? (
                        <Link
                            href={buildPageUrl(page + 1)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.5rem 1rem',
                                background: 'var(--accent)',
                                borderRadius: '8px',
                                color: 'white',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontWeight: '600'
                            }}
                        >
                            Next
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                    ) : <div />}
                </div>
            )}
        </div>
    );
}

function IncidentCard({ incident }: { incident: Incident }) {
    return (
        <Link href={`/m/incidents/${incident.id}`} className="mobile-incident-card">
            <div className="mobile-incident-header">
                <span className={`mobile-incident-status ${incident.status.toLowerCase()}`}>
                    {incident.status}
                </span>
                {incident.urgency && (
                    <span className={`mobile-incident-urgency ${incident.urgency.toLowerCase()}`}>
                        {incident.urgency}
                    </span>
                )}
            </div>
            <div className="mobile-incident-title">{incident.title}</div>
            <div className="mobile-incident-meta">
                <span>{incident.service.name}</span>
                <span>•</span>
                <span>{formatTimeAgo(incident.createdAt)}</span>
                {incident.assignee?.name && (
                    <>
                        <span>•</span>
                        <span>{incident.assignee.name}</span>
                    </>
                )}
            </div>
        </Link>
    );
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

