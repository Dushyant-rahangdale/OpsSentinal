import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import StatusPageHeader from '@/components/status-page/StatusPageHeader';
import StatusPageServices from '@/components/status-page/StatusPageServices';
import StatusPageIncidents from '@/components/status-page/StatusPageIncidents';
import StatusPageMetrics from '@/components/status-page/StatusPageMetrics';
import StatusPageSubscribe from '@/components/status-page/StatusPageSubscribe';
import StatusPageAnnouncements from '@/components/status-page/StatusPageAnnouncements';

export const revalidate = 60; // Revalidate every minute for status page

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
    const enableSubscriptions = branding.enableSubscriptions !== false;
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
                _count: {
                    select: {
                        incidents: {
                            where: {
                                status: { not: 'RESOLVED' },
                            },
                        },
                    },
                },
                incidents: {
                    where: {
                        status: { not: 'RESOLVED' },
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
                _count: {
                    select: {
                        incidents: {
                            where: {
                                status: { not: 'RESOLVED' },
                            },
                        },
                    },
                },
                incidents: {
                    where: {
                        status: { not: 'RESOLVED' },
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
        const highUrgencyIncidents = activeIncidents.filter((inc: any) => inc.urgency === 'HIGH');
        const lowUrgencyIncidents = activeIncidents.filter((inc: any) => inc.urgency === 'LOW');

        // Determine status based on incidents
        let calculatedStatus = 'OPERATIONAL';
        if (highUrgencyIncidents.length > 0) {
            calculatedStatus = 'MAJOR_OUTAGE';
        } else if (lowUrgencyIncidents.length > 0) {
            calculatedStatus = 'PARTIAL_OUTAGE';
        }

        return {
            ...service,
            status: calculatedStatus, // Override with calculated status
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get all incidents in the period for uptime calculation
    const allIncidents = await prisma.incident.findMany({
        where: {
            serviceId: { in: incidentServiceIds },
            createdAt: { gte: ninetyDaysAgo },
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

    // Calculate overall status (default to operational if no services)
    const hasOutage = services.length > 0 && services.some((s: any) => s.status === 'MAJOR_OUTAGE' || s.status === 'PARTIAL_OUTAGE');
    const hasDegraded = services.length > 0 && services.some((s: any) => s.status === 'DEGRADED');
    const overallStatus = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

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
                    background: `linear-gradient(180deg, ${backgroundColor}15 0%, ${backgroundColor} 100%)`,
                }}
            >
                {/* Header */}
                {showHeader && (
                    <StatusPageHeader 
                        statusPage={statusPage} 
                        overallStatus={overallStatus}
                        branding={branding}
                    />
                )}

                {/* Main Content */}
                <main style={{ maxWidth, margin: '0 auto', padding: layout === 'compact' ? '1.5rem' : '2rem' }}>
                    {/* Subscribe Section */}
                    {enableSubscriptions && (
                        <StatusPageSubscribe 
                            statusPage={statusPage} 
                            branding={branding}
                        />
                    )}

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
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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

                    {/* Metrics */}
                    {statusPage.showMetrics && services.length > 0 && (
                        <StatusPageMetrics 
                            services={services}
                            incidents={allIncidents}
                            thirtyDaysAgo={thirtyDaysAgo}
                            ninetyDaysAgo={ninetyDaysAgo}
                        />
                    )}

                    {/* Recent Incidents */}
                    {statusPage.showIncidents && (
                        <>
                            {recentIncidents.length > 0 ? (
                                <StatusPageIncidents incidents={recentIncidents} />
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
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    }}>
                                        <p>No incidents in the last 90 days.</p>
                                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#10b981' }}>
                                            All systems operational ✓
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
                                    {showRssLink && showApiLink && <span>•</span>}
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
