import prisma from '@/lib/prisma';
import MobileCard from '@/components/mobile/MobileCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type ServiceStatus = {
    id: string;
    name: string;
    status: string;
    incidentCount: number;
};

type ActiveIncident = {
    id: string;
    title: string;
    status: string;
    urgency: string;
    serviceName: string;
    createdAt: Date;
    updatedAt: Date;
};

type Announcement = {
    id: string;
    title: string;
    type: string;
    message: string;
    startDate: Date;
    endDate: Date | null;
};

export default async function MobileStatusPage() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get status page config
    const statusPage = await prisma.statusPage.findFirst({
        where: { enabled: true },
        include: {
            services: {
                where: { showOnPage: true },
                include: {
                    service: {
                        include: {
                            incidents: {
                                where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
                                select: { id: true, urgency: true }
                            }
                        }
                    }
                },
                orderBy: { order: 'asc' }
            },
            announcements: {
                where: {
                    isActive: true,
                    OR: [{ endDate: null }, { endDate: { gte: now } }],
                },
                orderBy: { startDate: 'desc' },
                take: 5,
            },
        }
    });

    if (!statusPage) {
        return (
            <div className="mobile-dashboard">
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>Status</h1>
                <MobileCard>
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                        <p>Status page not configured.</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Contact your administrator to set up a status page.</p>
                    </div>
                </MobileCard>
            </div>
        );
    }

    // Calculate service statuses
    const serviceStatuses: ServiceStatus[] = statusPage.services.map(sp => {
        const activeIncidents = sp.service.incidents;
        const hasMajor = activeIncidents.some(i => i.urgency === 'HIGH');
        const hasMinor = activeIncidents.some(i => i.urgency === 'LOW');

        let status = 'OPERATIONAL';
        if (hasMajor) status = 'MAJOR_OUTAGE';
        else if (hasMinor) status = 'PARTIAL_OUTAGE';

        return {
            id: sp.service.id,
            name: sp.service.name,
            status,
            incidentCount: activeIncidents.length
        };
    });

    // Overall status
    let overallStatus = 'OPERATIONAL';
    if (serviceStatuses.some(s => s.status === 'MAJOR_OUTAGE')) overallStatus = 'MAJOR_OUTAGE';
    else if (serviceStatuses.some(s => s.status === 'PARTIAL_OUTAGE')) overallStatus = 'PARTIAL_OUTAGE';

    // Get active incidents with details
    const serviceIds = statusPage.services.map(sp => sp.serviceId);
    const activeIncidents: ActiveIncident[] = serviceIds.length > 0 ? await prisma.incident.findMany({
        where: {
            serviceId: { in: serviceIds },
            status: { in: ['OPEN', 'ACKNOWLEDGED'] }
        },
        include: {
            service: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    }).then(incidents => incidents.map(inc => ({
        id: inc.id,
        title: inc.title,
        status: inc.status,
        urgency: inc.urgency,
        serviceName: inc.service.name,
        createdAt: inc.createdAt,
        updatedAt: inc.updatedAt
    }))) : [];

    // Get recent resolved incidents (history)
    const recentHistory = serviceIds.length > 0 ? await prisma.incident.findMany({
        where: {
            serviceId: { in: serviceIds },
            status: 'RESOLVED',
            resolvedAt: { gte: thirtyDaysAgo }
        },
        include: {
            service: { select: { name: true } }
        },
        orderBy: { resolvedAt: 'desc' },
        take: 10
    }) : [];

    // Announcements
    const announcements: Announcement[] = statusPage.announcements.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        message: a.message,
        startDate: a.startDate,
        endDate: a.endDate
    }));

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPERATIONAL': return '#16a34a';
            case 'PARTIAL_OUTAGE': return '#d97706';
            case 'MAJOR_OUTAGE': return '#dc2626';
            default: return '#6b7280';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'OPERATIONAL': return 'Operational';
            case 'PARTIAL_OUTAGE': return 'Partial Outage';
            case 'MAJOR_OUTAGE': return 'Major Outage';
            default: return 'Unknown';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPERATIONAL': return '✅';
            case 'PARTIAL_OUTAGE': return '⚠️';
            case 'MAJOR_OUTAGE': return '❌';
            default: return '❓';
        }
    };

    const getUrgencyBadge = (urgency: string) => {
        if (urgency === 'HIGH') {
            return { bg: 'var(--badge-error-bg)', text: 'var(--badge-error-text)', label: 'High' };
        }
        return { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)', label: 'Low' };
    };

    const getAnnouncementIcon = (type: string) => {
        switch (type) {
            case 'MAINTENANCE': return '🔧';
            case 'INCIDENT': return '🚨';
            case 'INFO': return 'ℹ️';
            default: return '📢';
        }
    };

    const formatTimeAgo = (date: Date) => {
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="mobile-dashboard">
            {/* Page Title */}
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                {statusPage.name || 'System Status'}
            </h1>

            {/* Overall Status Banner */}
            <MobileCard style={{
                marginBottom: '1.25rem',
                borderLeft: `4px solid ${getStatusColor(overallStatus)}`,
                background: overallStatus === 'OPERATIONAL'
                    ? 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, var(--card-bg) 100%)'
                    : overallStatus === 'MAJOR_OUTAGE'
                        ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, var(--card-bg) 100%)'
                        : 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, var(--card-bg) 100%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                    <div style={{ fontSize: '2.5rem' }}>
                        {getStatusIcon(overallStatus)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                            {overallStatus === 'OPERATIONAL' ? 'All Systems Operational' : getStatusLabel(overallStatus)}
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                            {activeIncidents.length === 0
                                ? 'No active incidents'
                                : `${activeIncidents.length} active incident${activeIncidents.length > 1 ? 's' : ''}`}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }} suppressHydrationWarning>
                            Updated {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            </MobileCard>

            {/* Announcements */}
            {announcements.length > 0 && (
                <section style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📢 Announcements
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {announcements.map(announcement => (
                            <MobileCard key={announcement.id} padding="sm" style={{
                                borderLeft: `3px solid ${announcement.type === 'MAINTENANCE' ? '#3b82f6' : announcement.type === 'INCIDENT' ? '#dc2626' : '#6b7280'}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1.25rem' }}>{getAnnouncementIcon(announcement.type)}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                            {announcement.title}
                                        </div>
                                        <p style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                            margin: 0,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {announcement.message}
                                        </p>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            {new Date(announcement.startDate).toLocaleDateString()}
                                            {announcement.endDate && ` - ${new Date(announcement.endDate).toLocaleDateString()}`}
                                        </div>
                                    </div>
                                </div>
                            </MobileCard>
                        ))}
                    </div>
                </section>
            )}

            {/* Active Incidents */}
            {activeIncidents.length > 0 && (
                <section style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🚨 Active Incidents
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {activeIncidents.map(incident => {
                            const urgencyBadge = getUrgencyBadge(incident.urgency);
                            return (
                                <Link
                                    key={incident.id}
                                    href={`/m/incidents/${incident.id}`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <MobileCard padding="sm" style={{
                                        borderLeft: `3px solid ${incident.urgency === 'HIGH' ? '#dc2626' : '#d97706'}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: '600',
                                                    fontSize: '0.9rem',
                                                    color: 'var(--text-primary)',
                                                    marginBottom: '0.25rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {incident.title}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {incident.serviceName}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                    {formatTimeAgo(incident.createdAt)}
                                                </div>
                                            </div>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: '600',
                                                background: urgencyBadge.bg,
                                                color: urgencyBadge.text,
                                                flexShrink: 0
                                            }}>
                                                {urgencyBadge.label}
                                            </span>
                                        </div>
                                    </MobileCard>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Services */}
            <section style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🖥️ Services ({serviceStatuses.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {serviceStatuses.map(service => (
                        <MobileCard key={service.id} padding="sm" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                <span style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: getStatusColor(service.status),
                                    flexShrink: 0
                                }} />
                                <span style={{
                                    fontWeight: '500',
                                    color: 'var(--text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {service.name}
                                </span>
                            </div>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: getStatusColor(service.status),
                                flexShrink: 0
                            }}>
                                {getStatusLabel(service.status)}
                            </span>
                        </MobileCard>
                    ))}
                    {serviceStatuses.length === 0 && (
                        <MobileCard padding="sm">
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                                No services configured
                            </div>
                        </MobileCard>
                    )}
                </div>
            </section>

            {/* Recent History */}
            {recentHistory.length > 0 && (
                <section style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📜 Recent History (30 days)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recentHistory.map(incident => (
                            <Link
                                key={incident.id}
                                href={`/m/incidents/${incident.id}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <MobileCard padding="sm" style={{ opacity: 0.85 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: '500',
                                                fontSize: '0.85rem',
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {incident.title}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                {incident.service.name} • Resolved {formatTimeAgo(incident.resolvedAt!)}
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '4px',
                                            fontSize: '0.65rem',
                                            fontWeight: '600',
                                            background: 'var(--badge-success-bg)',
                                            color: 'var(--badge-success-text)',
                                            flexShrink: 0
                                        }}>
                                            Resolved
                                        </span>
                                    </div>
                                </MobileCard>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Footer */}
            <div style={{
                textAlign: 'center',
                padding: '1rem 0',
                borderTop: '1px solid var(--border)',
                marginTop: '1rem'
            }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Powered by OpsSentinal
                </p>
            </div>
        </div>
    );
}
