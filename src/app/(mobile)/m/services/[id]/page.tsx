import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function MobileServiceDetailPage({ params }: PageProps) {
    const { id } = await params;

    const service = await prisma.service.findUnique({
        where: { id },
        include: {
            policy: true,
            incidents: {
                where: { status: { not: 'RESOLVED' } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    urgency: true,
                    createdAt: true,
                },
            },
            _count: {
                select: {
                    incidents: { where: { status: { not: 'RESOLVED' } } },
                },
            },
        },
    });

    if (!service) {
        notFound();
    }

    const isHealthy = service._count.incidents === 0;

    return (
        <div className="mobile-dashboard">
            {/* Back Button */}
            <Link
                href="/m/services"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to Services
            </Link>

            {/* Service Header */}
            <div className="mobile-metric-card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    {/* Health Indicator */}
                    <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: isHealthy ? 'var(--color-success)' : 'var(--color-error)',
                        boxShadow: isHealthy
                            ? '0 0 10px rgba(22, 163, 74, 0.4)'
                            : '0 0 10px rgba(220, 38, 38, 0.4)',
                        marginTop: '4px',
                        flexShrink: 0,
                    }} />

                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 0.25rem' }}>
                            {service.name}
                        </h1>
                        {service.description && (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {service.description}
                            </p>
                        )}
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            background: isHealthy ? 'var(--badge-success-bg)' : 'var(--badge-error-bg)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: isHealthy ? 'var(--badge-success-text)' : 'var(--badge-error-text)',
                        }}>
                            {isHealthy ? '✓ Operational' : `⚠ ${service._count.incidents} Open Incident${service._count.incidents !== 1 ? 's' : ''}`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: '1rem' }}>
                <Link
                    href={`/m/incidents/create?serviceId=${service.id}`}
                    className="mobile-quick-action"
                    style={{ display: 'flex', width: '100%' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
                    </svg>
                    New Incident
                </Link>
            </div>

            {/* Service Info */}
            <div className="mobile-metric-card" style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 0.75rem' }}>Details</h3>
                <DetailRow label="Escalation Policy" value={service.policy?.name || 'None'} />
                <DetailRow label="Created" value={formatDate(service.createdAt)} />
            </div>

            {/* Open Incidents */}
            {service.incidents.length > 0 && (
                <div>
                    <div className="mobile-section-header">
                        <h2 className="mobile-section-title">Open Incidents</h2>
                        <Link href={`/m/incidents?serviceId=${service.id}`} className="mobile-section-link">
                            See all →
                        </Link>
                    </div>

                    <div className="mobile-incident-list">
                        {service.incidents.map((incident) => (
                            <Link
                                key={incident.id}
                                href={`/m/incidents/${incident.id}`}
                                className="mobile-incident-card"
                            >
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
                                    <span>{formatTimeAgo(incident.createdAt)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0.5rem 0',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.85rem',
        }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontWeight: '500' }}>{value}</span>
        </div>
    );
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
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
