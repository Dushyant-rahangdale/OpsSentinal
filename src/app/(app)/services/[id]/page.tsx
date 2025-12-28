import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import HoverLink from '@/components/service/HoverLink';
import ServiceTabs from '@/components/service/ServiceTabs';
import IncidentList from '@/components/service/IncidentList';
import Pagination from '@/components/service/Pagination';
import StatusBadge from '@/components/incident/StatusBadge';
import DeleteServiceButton from '@/components/service/DeleteServiceButton';
import { deleteService } from '../actions';
import { getUserPermissions } from '@/lib/rbac';

const INCIDENTS_PER_PAGE = 20;

type ServiceDetailPageProps = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ page?: string }>;
};

export default async function ServiceDetailPage({ params, searchParams }: ServiceDetailPageProps) {
    const { id } = await params;
    const searchParamsResolved = await searchParams;
    const page = Math.max(1, parseInt(searchParamsResolved?.page || '1', 10));
    const skip = (page - 1) * INCIDENTS_PER_PAGE;

    const [service, totalIncidentsCount] = await Promise.all([
        prisma.service.findUnique({
            where: { id },
            include: {
                team: true,
                policy: {
                    select: { id: true, name: true }
                },
                incidents: {
                    include: {
                        assignee: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: INCIDENTS_PER_PAGE
                },
                _count: {
                    select: { incidents: true }
                }
            }
        }),
        prisma.incident.count({
            where: { serviceId: id }
        })
    ]);

    if (!service) {
        notFound();
    }

    const permissions = await getUserPermissions();
    const canDeleteService = permissions.isAdmin;

    // Calculate dynamic status
    const allOpenIncidents = await prisma.incident.findMany({
        where: {
            serviceId: id,
            status: { not: 'RESOLVED' }
        },
        select: { urgency: true }
    });
    const hasCritical = allOpenIncidents.some(i => i.urgency === 'HIGH');
    const dynamicStatus = hasCritical ? 'CRITICAL' : allOpenIncidents.length > 0 ? 'DEGRADED' : 'OPERATIONAL';

    // Get all incidents for calculations
    const allIncidents = await prisma.incident.findMany({
        where: { serviceId: id },
        select: {
            status: true,
            urgency: true,
            createdAt: true,
            resolvedAt: true
        }
    });

    const resolvedIncidents = allIncidents.filter(i => i.status === 'RESOLVED');
    const criticalIncidents = allOpenIncidents.filter(i => i.urgency === 'HIGH');
    const totalIncidents = service._count.incidents;

    // Calculate average resolution time
    const resolvedWithTime = resolvedIncidents.filter(i => i.resolvedAt && i.createdAt);
    const avgResolutionTime = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, incident) => {
            const resolutionTime = (incident.resolvedAt!.getTime() - incident.createdAt.getTime()) / (1000 * 60);
            return sum + resolutionTime;
        }, 0) / resolvedWithTime.length
        : undefined;

    // Calculate SLA compliance
    let slaCompliance = 100;
    if (service.targetResolveMinutes && resolvedWithTime.length > 0) {
        const slaCompliant = resolvedWithTime.filter(i => {
            const resolutionTime = (i.resolvedAt!.getTime() - i.createdAt.getTime()) / (1000 * 60);
            return resolutionTime <= service.targetResolveMinutes;
        }).length;
        slaCompliance = (slaCompliant / resolvedWithTime.length) * 100;
    }

    // Get recent incidents (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentIncidents = allIncidents.filter(i => i.createdAt >= sevenDaysAgo).length;

    // Calculate resolution rate
    const resolutionRate = totalIncidents > 0
        ? (resolvedIncidents.length / totalIncidents) * 100
        : 100;

    // Calculate MTTR (Mean Time To Resolution) in hours
    const mttr = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, incident) => {
            const resolutionTime = (incident.resolvedAt!.getTime() - incident.createdAt.getTime()) / (1000 * 60 * 60);
            return sum + resolutionTime;
        }, 0) / resolvedWithTime.length
        : undefined;

    // Calculate incident frequency (incidents per month)
    const serviceAgeDays = (new Date().getTime() - service.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const incidentsPerMonth = serviceAgeDays > 0
        ? (totalIncidents / serviceAgeDays) * 30
        : 0;

    // Calculate uptime percentage (simplified - based on resolved vs total)
    // If all incidents are resolved quickly, uptime is high
    const uptimePercentage = totalIncidents === 0
        ? 100
        : Math.max(0, 100 - (allOpenIncidents.length / totalIncidents) * 100);

    const totalPages = Math.ceil(totalIncidentsCount / INCIDENTS_PER_PAGE);
    const deleteServiceWithId = deleteService.bind(null, service.id);

    return (
        <main style={{ padding: '2rem 1.5rem' }}>
            {/* Back Link */}
            <HoverLink
                href="/services"
                style={{
                    marginBottom: '2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Services
            </HoverLink>

            {/* Header */}
            <div style={{
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid var(--border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <StatusBadge status={dynamicStatus as any} size="lg" showDot />
                        </div>
                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: '800',
                            marginBottom: '0.5rem',
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.02em'
                        }}>
                            {service.name}
                        </h1>
                        {service.region && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '999px',
                                border: '1px solid var(--border)',
                                background: '#f8fafc',
                                color: 'var(--text-secondary)',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                marginBottom: '0.75rem',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                {service.region}
                            </div>
                        )}
                        {service.description && (
                            <p style={{
                                color: 'var(--text-secondary)',
                                fontSize: '1.05rem',
                                maxWidth: '800px',
                                lineHeight: 1.6
                            }}>
                                {service.description}
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <HoverLink
                            href={`/services/${id}/integrations`}
                            className="glass-button"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                            Integrations
                        </HoverLink>
                        <HoverLink
                            href={`/services/${id}/settings`}
                            className="glass-button"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                            </svg>
                            Settings
                        </HoverLink>
                        {canDeleteService && (
                            <DeleteServiceButton
                                action={deleteServiceWithId}
                                serviceName={service.name}
                                incidentCount={totalIncidents}
                                hasOpenIncidents={allOpenIncidents.length > 0}
                            />
                        )}
                    </div>
                </div>

                {/* Tab Navigation */}
                <ServiceTabs serviceId={id} />
            </div>

            {/* Key Metrics */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                {/* Service Availability */}
                <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid var(--border)',
                    borderRadius: '0px'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: '600' }}>
                        Service Availability
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: uptimePercentage >= 99 ? 'var(--success)' : uptimePercentage >= 95 ? 'var(--warning)' : 'var(--danger)',
                        marginBottom: '0.5rem'
                    }}>
                        {uptimePercentage.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {allOpenIncidents.length} active issue{allOpenIncidents.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* MTTR - Mean Time To Resolution */}
                {mttr !== undefined && (
                    <div style={{
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid var(--border)',
                        borderRadius: '0px'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: '600' }}>
                            MTTR
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            {mttr < 1
                                ? `${Math.round(mttr * 60)}m`
                                : mttr < 24
                                    ? `${mttr.toFixed(1)}h`
                                    : `${(mttr / 24).toFixed(1)}d`
                            }
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Mean Time To Resolution
                        </div>
                    </div>
                )}

                {/* Resolution Rate */}
                <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid var(--border)',
                    borderRadius: '0px'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: '600' }}>
                        Resolution Rate
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: resolutionRate >= 90 ? 'var(--success)' : resolutionRate >= 70 ? 'var(--warning)' : 'var(--danger)',
                        marginBottom: '0.5rem'
                    }}>
                        {resolutionRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {resolvedIncidents.length} of {totalIncidents} resolved
                    </div>
                </div>

                {/* Incident Frequency */}
                <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid var(--border)',
                    borderRadius: '0px'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: '600' }}>
                        Incident Frequency
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        {incidentsPerMonth < 1
                            ? '<1'
                            : incidentsPerMonth.toFixed(1)
                        }
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        per month
                    </div>
                </div>

                {/* Critical Incidents */}
                {criticalIncidents.length > 0 && (
                    <div style={{
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, #ffffff 100%)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '0px'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: '600' }}>
                            Critical Issues
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: 'var(--danger)',
                            marginBottom: '0.5rem'
                        }}>
                            {criticalIncidents.length}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: '600' }}>
                            Requires immediate attention
                        </div>
                    </div>
                )}

                {/* SLA Compliance - only show if not 100% */}
                {slaCompliance < 100 && (
                    <div style={{
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid var(--border)',
                        borderRadius: '0px'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: '600' }}>
                            SLA Compliance
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: slaCompliance >= 95 ? 'var(--success)' : slaCompliance >= 80 ? 'var(--warning)' : 'var(--danger)',
                            marginBottom: '0.5rem'
                        }}>
                            {slaCompliance.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Target: {service.targetResolveMinutes}m
                        </div>
                    </div>
                )}
            </div>

            {/* Incidents Section */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            marginBottom: '0.25rem',
                            color: 'var(--text-primary)'
                        }}>
                            Incidents
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {totalIncidentsCount} total incident{totalIncidentsCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <HoverLink
                        href={`/incidents/create?serviceId=${id}`}
                        className="glass-button primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        Create Incident
                    </HoverLink>
                </div>

                <IncidentList
                    incidents={service.incidents.map(i => ({
                        id: i.id,
                        title: i.title,
                        status: i.status,
                        urgency: i.urgency,
                        priority: i.priority,
                        createdAt: i.createdAt,
                        resolvedAt: i.resolvedAt,
                        assignee: i.assignee
                    }))}
                    serviceId={id}
                />

                {totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        baseUrl={`/services/${id}`}
                    />
                )}
            </div>
        </main>
    );
}
