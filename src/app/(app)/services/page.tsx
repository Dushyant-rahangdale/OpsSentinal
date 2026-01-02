import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDefaultActorId, logAudit } from '@/lib/audit';
import { getUserPermissions, assertAdminOrResponder } from '@/lib/rbac';
import { assertServiceNameAvailable, UniqueNameConflictError } from '@/lib/unique-names';
import { getServiceDynamicStatus } from '@/lib/service-status';
import ServiceCard from '@/components/service/ServiceCard';
import ServicesFilters from '@/components/service/ServicesFilters';
import CreateServiceForm from '@/components/service/CreateServiceForm';

export const revalidate = 30;

async function createService(formData: FormData) {
    'use server';
    try {
        await assertAdminOrResponder();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    const rawName = formData.get('name');
    const description = formData.get('description') as string;
    const region = formData.get('region') as string;
    const slaTier = formData.get('slaTier') as string;
    const teamId = formData.get('teamId') as string;
    const escalationPolicyId = formData.get('escalationPolicyId') as string;
    const name = typeof rawName === 'string' ? rawName : '';

    try {
        const normalizedName = await assertServiceNameAvailable(name);

        const service = await prisma.service.create({
            data: {
                name: normalizedName,
                description,
                region: region || null,
                slaTier: slaTier || null,
                teamId: teamId || undefined,
                escalationPolicyId: escalationPolicyId || undefined,
            },
        });

        await logAudit({
            action: 'service.created',
            entityType: 'SERVICE',
            entityId: service.id,
            actorId: await getDefaultActorId(),
            details: { name: normalizedName, teamId: teamId || null },
        });

        revalidatePath('/services');
        revalidatePath('/audit');
        redirect('/services');
    } catch (error) {
        if (error instanceof UniqueNameConflictError) {
            redirect('/services?error=duplicate-service');
        }

        throw error;
    }
}

type ServicesPageProps = {
    searchParams: Promise<{
        search?: string;
        status?: string;
        team?: string;
        sort?: string;
        error?: string;
    }>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
    const params = await searchParams;
    const searchQuery = typeof params?.search === 'string' ? params.search.trim() : '';
    const statusFilter = typeof params?.status === 'string' ? params.status : 'all';
    const teamFilter = typeof params?.team === 'string' ? params.team : '';
    const sortBy = typeof params?.sort === 'string' ? params.sort : 'name_asc';
    const errorCode = typeof params?.error === 'string' ? params.error : '';

    const [teams, policies] = await Promise.all([
        prisma.team.findMany({ orderBy: { name: 'asc' } }),
        prisma.escalationPolicy.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    // Build where clause for filtering
    const where: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        AND: [
            searchQuery
                ? {
                    OR: [
                        { name: { contains: searchQuery, mode: 'insensitive' as const } },
                        { description: { contains: searchQuery, mode: 'insensitive' as const } },
                    ],
                }
                : {},
            teamFilter ? { teamId: teamFilter } : {},
        ].filter(Boolean),
    };

    // Build orderBy clause
    let orderBy: any = { name: 'asc' }; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (sortBy === 'name_desc') {
        orderBy = { name: 'desc' };
    } else if (sortBy === 'name_asc') {
        orderBy = { name: 'asc' };
    } else if (sortBy === 'incidents_desc') {
        orderBy = { incidents: { _count: 'desc' } };
    } else if (sortBy === 'incidents_asc') {
        orderBy = { incidents: { _count: 'asc' } };
    }

    const services = await prisma.service.findMany({
        where,
        select: {
            id: true,
            name: true,
            description: true,
            region: true,
            status: true,
            team: true,
            policy: {
                select: { id: true, name: true },
            },
            _count: { select: { incidents: true } },
        },
        orderBy,
    });

    const serviceIds = services.map(service => service.id);
    const openIncidentsByService = new Map<string, { total: number; critical: number }>();

    if (serviceIds.length > 0) {
        const openIncidents = await prisma.incident.groupBy({
            by: ['serviceId', 'urgency'],
            where: {
                serviceId: { in: serviceIds },
                status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
            },
            _count: { _all: true },
        });

        openIncidents.forEach(group => {
            const entry = openIncidentsByService.get(group.serviceId) || { total: 0, critical: 0 };
            entry.total += group._count._all;
            if (group.urgency === 'HIGH') {
                entry.critical += group._count._all;
            }
            openIncidentsByService.set(group.serviceId, entry);
        });
    }

    const servicesWithStatus = services.map(service => {
        const counts = openIncidentsByService.get(service.id) || { total: 0, critical: 0 };
        const openIncidentCount = counts.total;
        const hasCritical = counts.critical > 0;
        const dynamicStatus = getServiceDynamicStatus({ openIncidentCount, hasCritical });

        return {
            ...service,
            openIncidentCount,
            hasCritical,
            dynamicStatus,
        };
    });

    // Apply status filter (client-side since status is calculated)
    const filteredServices = statusFilter === 'all'
        ? servicesWithStatus
        : servicesWithStatus.filter(service => service.dynamicStatus === statusFilter);

    // Apply sorting by status if needed (client-side)
    if (sortBy === 'status') {
        const statusOrder = { CRITICAL: 0, DEGRADED: 1, OPERATIONAL: 2 };
        filteredServices.sort((a, b) => {
            const aOrder = statusOrder[a.dynamicStatus as keyof typeof statusOrder] ?? 3;
            const bOrder = statusOrder[b.dynamicStatus as keyof typeof statusOrder] ?? 3;
            return aOrder - bOrder;
        });
    }

    const permissions = await getUserPermissions();
    const canCreateService = permissions.isAdminOrResponder;

    return (
        <main style={{ padding: '1.5rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Service Directory
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        Manage your services and monitor their health status
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                    border: '1px solid var(--border)',
                    borderRadius: '0px',
                }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                        Total Services:
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {filteredServices.length}
                    </span>
                </div>
            </header>

            {/* Create Service Form */}
            {errorCode === 'duplicate-service' && (
                <div className="glass-panel" style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    borderRadius: '0px',
                }}>
                    A service with this name already exists. Please choose a unique name.
                </div>
            )}
            {canCreateService ? (
                <CreateServiceForm
                    teams={teams}
                    policies={policies}
                    createAction={createService}
                />
            ) : (
                <div className="glass-panel" style={{
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    opacity: 0.7,
                    borderRadius: '0px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>!</span>
                        <div>
                            <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                                Create New Service
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                You do not have access to create services. Admin or Responder role required.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <ServicesFilters
                currentSearch={searchQuery}
                currentStatus={statusFilter}
                currentTeam={teamFilter}
                currentSort={sortBy}
                teams={teams}
            />

            {/* Services Grid */}
            {filteredServices.length === 0 ? (
                <div className="glass-panel empty-state" style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    background: 'white',
                    borderRadius: '0px',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>!</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        No services found
                    </h3>
                    <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                        {searchQuery || statusFilter !== 'all' || teamFilter
                            ? 'Try adjusting your filters or search query.'
                            : 'Create your first service to get started.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {filteredServices.map((service: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                        <ServiceCard key={service.id} service={service} compact={false} />
                    ))}
                </div>
            )}
        </main>
    );
}
