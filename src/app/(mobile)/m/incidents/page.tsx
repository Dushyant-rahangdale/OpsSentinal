import Link from 'next/link';
import { MobileEmptyIcon, MobileEmptyState } from '@/components/mobile/MobileUtils';
import MobileIncidentList from '@/components/mobile/MobileIncidentList';
import MobileListControls from '@/components/mobile/MobileListControls';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
type MobileIncidentFilter = 'all' | 'open' | 'resolved';
type MobileIncidentSort = 'created_desc' | 'created_asc' | 'urgency';

const normalizeFilter = (value?: string): MobileIncidentFilter => {
    if (value === 'open' || value === 'resolved') {
        return value;
    }
    return 'all';
};

const normalizeSort = (value?: string): MobileIncidentSort => {
    if (value === 'created_asc' || value === 'urgency') {
        return value;
    }
    return 'created_desc';
};

export default async function MobileIncidentsPage(props: {
    searchParams?: Promise<{ q?: string; filter?: string; page?: string; sort?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams?.q || '';
    const filter = normalizeFilter(searchParams?.filter);
    const sort = normalizeSort(searchParams?.sort);
    const page = Math.max(1, parseInt(searchParams?.page || '1', 10));

    const where: Prisma.IncidentWhereInput = {};

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

    const orderBy: Prisma.IncidentOrderByWithRelationInput[] =
        sort === 'created_asc'
            ? [{ createdAt: 'asc' }]
            : sort === 'urgency'
                ? [{ urgency: 'desc' }, { createdAt: 'desc' }]
                : [{ createdAt: 'desc' }];

    const [incidents, totalCount] = await Promise.all([
        prisma.incident.findMany({
            where,
            orderBy,
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
        if (sort && sort !== 'created_desc') params.set('sort', sort);
        params.set('page', newPage.toString());
        return `/m/incidents?${params.toString()}`;
    };

    return (
        <div className="mobile-dashboard mobile-incidents-page">
            {/* Header Stats */}
            <div className="mobile-incidents-header">
                <h1 className="mobile-incidents-title">Incidents</h1>
                <p className="mobile-incidents-subtitle">
                    {totalCount > 0 ? `${startIndex}-${endIndex} of ${totalCount}` : '0 incidents'}
                </p>
            </div>

            <MobileListControls
                basePath="/m/incidents"
                placeholder="Search incidents..."
                filters={[
                    { label: 'All', value: 'all' },
                    { label: 'Open', value: 'open' },
                    { label: 'Resolved', value: 'resolved' },
                ]}
                sortOptions={[
                    { label: 'Newest first', value: 'created_desc' },
                    { label: 'Oldest first', value: 'created_asc' },
                    { label: 'Urgency first', value: 'urgency' },
                ]}
            />

            {/* Create Button */}
            <Link
                href="/m/incidents/create"
                className="mobile-quick-action mobile-incidents-create"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
                </svg>
                New Incident
            </Link>

            {/* Incident List */}
            {incidents.length === 0 ? (
                <MobileEmptyState
                    icon={<MobileEmptyIcon />}
                    title="No incidents found"
                    description={query ? `No match for "${query}"` : "Change filters or create a new one"}
                    action={(
                        <>
                            <Link href="/m/incidents/create" className="mobile-empty-action primary">
                                Create incident
                            </Link>
                            {(query || filter !== 'all' || sort !== 'created_desc') && (
                                <Link href="/m/incidents" className="mobile-empty-action">
                                    Reset filters
                                </Link>
                            )}
                        </>
                    )}
                />
            ) : (
                <MobileIncidentList incidents={incidents} />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mobile-incidents-pagination">
                    {page > 1 ? (
                        <Link
                            href={buildPageUrl(page - 1)}
                            className="mobile-incidents-page-link"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Prev
                        </Link>
                    ) : <div />}

                    <span className="mobile-incidents-page-count">
                        Page {page} of {totalPages}
                    </span>

                    {page < totalPages ? (
                        <Link
                            href={buildPageUrl(page + 1)}
                            className="mobile-incidents-page-link primary"
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
