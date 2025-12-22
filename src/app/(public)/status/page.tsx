import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 60; // Revalidate every minute for status page

export default async function PublicStatusPage() {
    // Get the status page configuration (assuming single status page for now)
    const statusPage = await prisma.statusPage.findFirst({
        where: { enabled: true },
        include: {
            services: {
                include: {
                    service: true,
                },
                orderBy: { order: 'asc' },
            },
            announcements: {
                where: {
                    isActive: true,
                    OR: [
                        { endDate: null },
                        { endDate: { gte: new Date() } },
                    ],
                },
                orderBy: { startDate: 'desc' },
                take: 10,
            },
        },
    });

    // If no status page exists, create a default one
    if (!statusPage) {
        // Try to create a default status page
        try {
            statusPage = await prisma.statusPage.create({
                data: {
                    name: 'Status Page',
                    enabled: true,
                    showServices: true,
                    showIncidents: true,
                    showMetrics: true,
                },
                include: {
                    services: {
                        include: {
                            service: true,
                        },
                        orderBy: { order: 'asc' },
                    },
                    announcements: {
                        where: {
                            isActive: true,
                            OR: [
                                { endDate: null },
                                { endDate: { gte: new Date() } },
                            ],
                        },
                        orderBy: { startDate: 'desc' },
                        take: 10,
                    },
                },
            });
        } catch (error: any) {
            // If creation fails (e.g., table doesn't exist), show a helpful message
            console.error('Status page creation error:', error);
            const isTableMissing = error.message?.includes('does not exist') || 
                                  error.code === '42P01' ||
                                  error.message?.includes('StatusPage');
            
            return (
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f9fafb' }}>
                    <div style={{ textAlign: 'center', maxWidth: '600px', background: 'white', padding: '3rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                            Status Page Not Available
                        </h1>
                        {isTableMissing ? (
                            <>
                                <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                                    The database tables for the status page haven't been created yet. Please run the database migration.
                                </p>
                                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                                    <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem', fontWeight: '600' }}>Run this command:</p>
                                    <code style={{ 
                                        background: '#1f2937', 
                                        color: '#f9fafb',
                                        padding: '0.75rem 1rem', 
                                        borderRadius: '0.25rem',
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontFamily: 'monospace'
                                    }}>
                                        npx prisma db push
                                    </code>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                                    After running the migration, refresh this page.
                                </p>
                            </>
                        ) : (
                            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                                An error occurred while setting up the status page. Please check the server logs or contact support.
                            </p>
                        )}
                    </div>
                </div>
            );
        }
    }

    // Get current service statuses
    const serviceIds = statusPage.services
        .filter(sp => sp.showOnPage)
        .map(sp => sp.serviceId);

    const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        include: {
            _count: {
                select: {
                    incidents: {
                        where: {
                            status: { not: 'RESOLVED' },
                        },
                    },
                },
            },
        },
    });

    // Get recent incidents (last 30 days)
    const recentIncidents = statusPage.showIncidents
        ? await prisma.incident.findMany({
              where: {
                  serviceId: { in: serviceIds },
                  createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
              include: {
                  service: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 20,
          })
        : [];

    // Calculate overall status
    const hasOutage = services.some(s => s.status === 'MAJOR_OUTAGE' || s.status === 'PARTIAL_OUTAGE');
    const hasDegraded = services.some(s => s.status === 'DEGRADED');
    const overallStatus = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

    const statusColors = {
        operational: { bg: '#10b981', text: 'All systems operational' },
        degraded: { bg: '#f59e0b', text: 'Some systems experiencing issues' },
        outage: { bg: '#ef4444', text: 'Some systems are down' },
    };

    const status = statusColors[overallStatus];

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)' }}>
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '2rem 0',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{
                                fontSize: '2rem',
                                fontWeight: '800',
                                marginBottom: '0.5rem',
                                color: '#111827',
                            }}>
                                {statusPage.name}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: status.bg,
                                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                }}></div>
                                <span style={{ color: '#6b7280', fontSize: '1rem' }}>
                                    {status.text}
                                </span>
                            </div>
                        </div>
                        {statusPage.contactEmail && (
                            <a
                                href={`mailto:${statusPage.contactEmail}`}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: '#f3f4f6',
                                    borderRadius: '0.5rem',
                                    textDecoration: 'none',
                                    color: '#374151',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Contact Us
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {/* Announcements */}
                {statusPage.announcements.length > 0 && (
                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                            Announcements
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {statusPage.announcements.map((announcement) => (
                                <div
                                    key={announcement.id}
                                    style={{
                                        padding: '1.5rem',
                                        background: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        borderLeft: `4px solid ${
                                            announcement.type === 'INCIDENT' ? '#ef4444' :
                                            announcement.type === 'WARNING' ? '#f59e0b' :
                                            announcement.type === 'MAINTENANCE' ? '#3b82f6' :
                                            '#6b7280'
                                        }`,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                                            {announcement.title}
                                        </h3>
                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            {new Date(announcement.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p style={{ color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                        {announcement.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Services */}
                {statusPage.showServices && (
                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                            Services
                        </h2>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {statusPage.services
                                .filter(sp => sp.showOnPage)
                                .map((statusPageService) => {
                                    const service = services.find(s => s.id === statusPageService.serviceId);
                                    if (!service) return null;

                                    const serviceStatus = service.status;
                                    const activeIncidents = service._count.incidents;

                                    const statusConfig = {
                                        OPERATIONAL: { color: '#10b981', label: 'Operational' },
                                        DEGRADED: { color: '#f59e0b', label: 'Degraded' },
                                        PARTIAL_OUTAGE: { color: '#f59e0b', label: 'Partial Outage' },
                                        MAJOR_OUTAGE: { color: '#ef4444', label: 'Major Outage' },
                                        MAINTENANCE: { color: '#3b82f6', label: 'Maintenance' },
                                    }[serviceStatus] || { color: '#6b7280', label: 'Unknown' };

                                    return (
                                        <div
                                            key={statusPageService.id}
                                            style={{
                                                padding: '1.5rem',
                                                background: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                                                    {statusPageService.displayName || service.name}
                                                </h3>
                                                {activeIncidents > 0 && (
                                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                                        {activeIncidents} active incident{activeIncidents !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    background: statusConfig.color,
                                                }}></div>
                                                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </section>
                )}

                {/* Recent Incidents */}
                {statusPage.showIncidents && recentIncidents.length > 0 && (
                    <section>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                            Recent Incidents
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recentIncidents.map((incident) => (
                                <div
                                    key={incident.id}
                                    style={{
                                        padding: '1.5rem',
                                        background: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                                            {incident.title}
                                        </h3>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: incident.status === 'RESOLVED' ? '#d1fae5' :
                                                       incident.status === 'ACKNOWLEDGED' ? '#fef3c7' :
                                                       '#fee2e2',
                                            color: incident.status === 'RESOLVED' ? '#065f46' :
                                                   incident.status === 'ACKNOWLEDGED' ? '#92400e' :
                                                   '#991b1b',
                                        }}>
                                            {incident.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                        <span>{incident.service.name}</span>
                                        <span>•</span>
                                        <span>{new Date(incident.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                {statusPage.footerText && (
                    <footer style={{
                        marginTop: '4rem',
                        paddingTop: '2rem',
                        borderTop: '1px solid #e5e7eb',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                    }}>
                        <p>{statusPage.footerText}</p>
                    </footer>
                )}
            </main>
        </div>
    );
}

