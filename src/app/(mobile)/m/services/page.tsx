import prisma from '@/lib/prisma';
import Link from 'next/link';
import { MobileSearchWithParams } from '@/components/mobile/MobileSearchParams';

export const dynamic = 'force-dynamic';

export default async function MobileServicesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const params = await searchParams;
    const query = params.q || '';

    const services = await prisma.service.findMany({
        where: query ? {
            name: { contains: query, mode: 'insensitive' }
        } : undefined,
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: {
                    incidents: {
                        where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] } },
                    },
                },
            },
        },
    });

    const healthyCount = services.filter(s => s._count.incidents === 0).length;
    const degradedCount = services.filter(s => s._count.incidents > 0).length;

    return (
        <div className="mobile-dashboard">
            {/* Header */}
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Services</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {healthyCount} healthy · {degradedCount} with issues
                </p>
            </div>

            {/* Search */}
            <MobileSearchWithParams placeholder="Search services..." />
            <div style={{ height: '0.75rem' }} />

            {/* Service Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {services.length === 0 ? (
                    <EmptyState />
                ) : (
                    services.map((service) => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            openIncidents={service._count.incidents}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function ServiceCard({
    service,
    openIncidents
}: {
    service: { id: string; name: string; description: string | null };
    openIncidents: number;
}) {
    const isHealthy = openIncidents === 0;

    return (
        <Link
            href={`/m/services/${service.id}`}
            className="mobile-incident-card"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    {/* Status Indicator */}
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: isHealthy ? '#16a34a' : '#dc2626',
                        boxShadow: isHealthy
                            ? '0 0 8px rgba(22, 163, 74, 0.4)'
                            : '0 0 8px rgba(220, 38, 38, 0.4)',
                        flexShrink: 0,
                    }} />

                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{service.name}</div>
                        {service.description && (
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginTop: '0.125rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {service.description}
                            </div>
                        )}
                    </div>
                </div>

                {/* Open Incidents Badge */}
                {openIncidents > 0 && (
                    <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '999px',
                        background: 'var(--badge-error-bg)',
                        color: 'var(--badge-error-text)',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                    }}>
                        {openIncidents} open
                    </span>
                )}

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </Link>
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
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>No services</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Use desktop to create services
            </p>
        </div>
    );
}
