import prisma from '@/lib/prisma';
import StatusPageHeader from '@/components/status-page/StatusPageHeader';
import StatusPageServices from '@/components/status-page/StatusPageServices';
import StatusPageIncidents from '@/components/status-page/StatusPageIncidents';
import StatusPageAnnouncements from '@/components/status-page/StatusPageAnnouncements';

export const dynamic = 'force-dynamic';

export default async function PublicStatusPage() {
    // Get the status page configuration
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
        try {
            const newStatusPage = await prisma.statusPage.create({
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
            return renderStatusPage(newStatusPage);
        } catch (error: any) {
            console.error('Status page creation error:', error);
            const isTableMissing = error.message?.includes('does not exist') ||
                error.code === '42P01' ||
                error.message?.includes('StatusPage');

            return (
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f9fafb' }}>
                    <div style={{ textAlign: 'center', maxWidth: '600px', background: 'white', padding: '3rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>!</div>
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

    return renderStatusPage(statusPage);
}

async function renderStatusPage(statusPage: any) {
    // Parse branding
    const branding = statusPage.branding && typeof statusPage.branding === 'object'
        ? statusPage.branding
        : {};

    const primaryColor = branding.primaryColor || '#667eea';
    const backgroundColor = branding.backgroundColor || '#ffffff';
    const textColor = branding.textColor || '#111827';
    const customCss = branding.customCss || '';
    const layout = branding.layout || 'default';
    const showHeader = branding.showHeader !== false;
    const showFooter = branding.showFooter !== false;
    const showRssLink = branding.showRssLink !== false;
    const showApiLink = branding.showApiLink !== false;
    const autoRefresh = branding.autoRefresh !== false;
    const refreshInterval = branding.refreshInterval || 60;

    // Get current service statuses
    const serviceIds = statusPage.services
        .filter((sp: any) => sp.showOnPage)
        .map((sp: any) => sp.serviceId);

    // If no services are configured, get all services (or show empty state)
    let services: any[] = [];
    if (serviceIds.length > 0) {
        services = await prisma.service.findMany({
            where: { id: { in: serviceIds } },
            include: {
                team: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        incidents: {
                            where: {
                                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                            },
                        },
                    },
                },
                incidents: {
                    where: {
                        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                    },
                    select: {
                        urgency: true,
                        status: true,
                    },
                },
            },
        });
    } else {
        // If no services configured, get all services as fallback
        services = await prisma.service.findMany({
            include: {
                team: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        incidents: {
                            where: {
                                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                            },
                        },
                    },
                },
                incidents: {
                    where: {
                        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                    },
                    select: {
                        urgency: true,
                        status: true,
                    },
                },
            },
            take: 20, // Limit to prevent too many
        });
    }

    // Calculate actual status based on active incidents
    services = services.map(service => {
        const activeIncidents = service.incidents || [];

        // Filter out resolved incidents (shouldn't happen, but just in case)
        const unresolvedIncidents = activeIncidents.filter((inc: any) =>
            inc.status !== 'RESOLVED' && inc.status !== 'SNOOZED' && inc.status !== 'SUPPRESSED'
        );

        const highUrgencyIncidents = unresolvedIncidents.filter((inc: any) => inc.urgency === 'HIGH');
        const lowUrgencyIncidents = unresolvedIncidents.filter((inc: any) => inc.urgency === 'LOW');

        // Determine status based on incidents
        // Priority: HIGH urgency incidents = MAJOR_OUTAGE, LOW urgency = PARTIAL_OUTAGE, none = OPERATIONAL
        let calculatedStatus = 'OPERATIONAL';
        if (highUrgencyIncidents.length > 0) {
            calculatedStatus = 'MAJOR_OUTAGE';
        } else if (lowUrgencyIncidents.length > 0) {
            calculatedStatus = 'PARTIAL_OUTAGE';
        }

        return {
            ...service,
            status: calculatedStatus, // Override with calculated status based on active incidents
        };
    });

    // Get recent incidents (last 90 days) with events
    // Use all services if none configured, or specific service IDs
    const incidentServiceIds = serviceIds.length > 0 ? serviceIds : services.map(s => s.id);
    const recentIncidents = statusPage.showIncidents
        ? await prisma.incident.findMany({
            where: {
                serviceId: { in: incidentServiceIds },
                createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            include: {
                service: true,
                events: {
                    orderBy: { createdAt: 'asc' },
                    take: 50, // Get recent events for timeline
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })
        : [];

    // Calculate uptime metrics for last 30 and 90 days
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get incidents for status history and uptime calculation
    const allIncidents = await prisma.incident.findMany({
        where: {
            serviceId: { in: incidentServiceIds },
            OR: [
                { createdAt: { gte: ninetyDaysAgo } },
                { resolvedAt: { gte: ninetyDaysAgo } },
                { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
            ],
        },
        select: {
            id: true,
            serviceId: true,
            createdAt: true,
            resolvedAt: true,
            status: true,
            urgency: true,
        },
    });

    const activeIncidents = allIncidents.filter((inc: any) =>
        inc.status !== 'RESOLVED' && inc.status !== 'SNOOZED' && inc.status !== 'SUPPRESSED'
    );
    const hasOutage = activeIncidents.some((inc: any) => inc.urgency === 'HIGH');
    const hasDegraded = activeIncidents.some((inc: any) => inc.urgency === 'LOW');
    const overallStatus = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

    const serviceUptime90 = buildServiceUptime(allIncidents, services, ninetyDaysAgo, now);
    const incidentsForHistory = allIncidents.map((incident) => ({
        serviceId: incident.serviceId,
        createdAt: incident.createdAt.toISOString(),
        resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
        status: incident.status,
        urgency: incident.urgency,
    }));

    // Determine max width based on layout
    const maxWidth = layout === 'wide' ? '1600px' : layout === 'compact' ? '900px' : '1200px';

    return (
        <>
            {/* Custom CSS */}
            {customCss && (
                <style dangerouslySetInnerHTML={{ __html: customCss }} />
            )}

            {/* Auto-refresh script */}
            {autoRefresh && refreshInterval >= 30 && (
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            setTimeout(function() {
                                window.location.reload();
                            }, ${refreshInterval * 1000});
                        `,
                    }}
                />
            )}

            <div
                className="status-page-container"
                style={{
                    minHeight: '100vh',
                    background: '#f8fafc',
                }}
            >
                {/* Header */}
                {showHeader && (
                    <StatusPageHeader
                        statusPage={statusPage}
                        overallStatus={overallStatus}
                        branding={branding}
                        lastUpdated={now.toISOString()}
                    />
                )}

                {/* Main Content */}
                <main style={{
                    width: '100%',
                    margin: '0 auto',
                    padding: layout === 'compact' ? '1.5rem' : '2rem',
                    boxSizing: 'border-box',
                }}>
                    {/* Announcements */}
                    {statusPage.announcements.length > 0 && (
                        <StatusPageAnnouncements announcements={statusPage.announcements} />
                    )}

                    {/* Services */}
                    {statusPage.showServices && (
                        <>
                            {services.length > 0 ? (
                                <StatusPageServices
                                    services={services}
                                    statusPageServices={statusPage.services}
                                    uptime90={serviceUptime90}
                                    incidents={incidentsForHistory}
                                />
                            ) : (
                                <section style={{ marginBottom: '3rem' }}>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        marginBottom: '1.5rem',
                                        color: textColor,
                                    }}>
                                        Services
                                    </h2>
                                    <div style={{
                                        padding: '3rem',
                                        background: backgroundColor,
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.75rem',
                                        textAlign: 'center',
                                        color: '#6b7280',
                                    }}>
                                        <p>No services configured for this status page.</p>
                                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                            Configure services in the status page settings.
                                        </p>
                                    </div>
                                </section>
                            )}
                        </>
                    )}

                    {/* Recent Incidents */}
                    {statusPage.showIncidents && (
                        <>
                            {recentIncidents.length > 0 ? (
                                <div id="incidents">
                                    <StatusPageIncidents incidents={recentIncidents} />
                                </div>
                            ) : (
                                <section style={{ marginBottom: '3rem' }}>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        marginBottom: '1.5rem',
                                        color: textColor,
                                    }}>
                                        Recent Incidents
                                    </h2>
                                    <div style={{
                                        padding: '3rem',
                                        background: backgroundColor,
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.75rem',
                                        textAlign: 'center',
                                        color: '#6b7280',
                                    }}>
                                        <p>No incidents in the last 90 days.</p>
                                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#10b981' }}>
                                            All systems operational
                                        </p>
                                    </div>
                                </section>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    {showFooter && (statusPage.footerText || showRssLink || showApiLink) && (
                        <footer style={{
                            marginTop: '4rem',
                            paddingTop: '2rem',
                            borderTop: '1px solid #e5e7eb',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontSize: '0.875rem',
                        }}>
                            {statusPage.footerText && <p style={{ marginBottom: '1rem' }}>{statusPage.footerText}</p>}
                            {(showRssLink || showApiLink) && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    {showRssLink && (
                                        <a href="/api/status/rss" style={{ color: '#6b7280', textDecoration: 'none' }}>
                                            RSS Feed
                                        </a>
                                    )}
                                    {showRssLink && showApiLink && <span>|</span>}
                                    {showApiLink && (
                                        <a href="/api/status" style={{ color: '#6b7280', textDecoration: 'none' }}>
                                            JSON API
                                        </a>
                                    )}
                                </div>
                            )}
                        </footer>
                    )}
                </main>
            </div>
        </>
    );
}


function buildServiceUptime(
    incidents: Array<{
        serviceId: string;
        createdAt: Date;
        resolvedAt?: Date | null;
        status: string;
    }>,
    services: Array<{ id: string }>,
    periodStart: Date,
    periodEnd: Date
) {
    const uptimeByService: Record<string, number> = {};
    const totalMinutes = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60);

    services.forEach((service) => {
        if (totalMinutes <= 0) {
            uptimeByService[service.id] = 100;
            return;
        }

        const serviceIncidents = incidents.filter((incident) => {
            if (incident.serviceId !== service.id) {
                return false;
            }
            if (incident.status === 'SUPPRESSED' || incident.status === 'SNOOZED') {
                return false;
            }
            const incidentEnd = incident.resolvedAt || periodEnd;
            return incident.createdAt < periodEnd && incidentEnd > periodStart;
        });

        let downtimeMinutes = 0;
        serviceIncidents.forEach((incident) => {
            const incidentStart = incident.createdAt > periodStart ? incident.createdAt : periodStart;
            const incidentEnd = (incident.resolvedAt || periodEnd) < periodEnd
                ? (incident.resolvedAt || periodEnd)
                : periodEnd;
            const incidentMinutes = (incidentEnd.getTime() - incidentStart.getTime()) / (1000 * 60);
            if (incidentMinutes > 0) {
                downtimeMinutes += incidentMinutes;
            }
        });

        const uptime = totalMinutes > 0 ? ((totalMinutes - downtimeMinutes) / totalMinutes) * 100 : 100;
        uptimeByService[service.id] = Math.max(0, Math.min(100, uptime));
    });

    return uptimeByService;
}
