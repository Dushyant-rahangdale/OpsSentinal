import prisma from '@/lib/prisma';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDefaultActorId, logAudit } from '@/lib/audit';
import { getUserPermissions, assertAdminOrResponder } from '@/lib/rbac';
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
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const slackWebhookUrl = formData.get('slackWebhookUrl') as string;
    const teamId = formData.get('teamId') as string;

    const service = await prisma.service.create({
        data: {
            name,
            description,
            slackWebhookUrl: slackWebhookUrl || undefined,
            teamId: teamId || undefined
        }
    });

    await logAudit({
        action: 'service.created',
        entityType: 'SERVICE',
        entityId: service.id,
        actorId: await getDefaultActorId(),
        details: { name, teamId: teamId || null }
    });

    revalidatePath('/services');
    revalidatePath('/audit');
    redirect('/services');
}

type ServicesPageProps = {
    searchParams: Promise<{
        search?: string;
        status?: string;
        team?: string;
        sort?: string;
    }>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
    const params = await searchParams;
    const searchQuery = typeof params?.search === 'string' ? params.search.trim() : '';
    const statusFilter = typeof params?.status === 'string' ? params.status : 'all';
    const teamFilter = typeof params?.team === 'string' ? params.team : '';
    const sortBy = typeof params?.sort === 'string' ? params.sort : 'name_asc';

    const [teams, policies] = await Promise.all([
        prisma.team.findMany({ orderBy: { name: 'asc' } }),
        prisma.escalationPolicy.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
    ]);

    // Build where clause for filtering
    const where: any = {
        AND: [
            searchQuery
                ? {
                    OR: [
                        { name: { contains: searchQuery, mode: 'insensitive' as const } },
                        { description: { contains: searchQuery, mode: 'insensitive' as const } }
                    ]
                }
                : {},
            teamFilter ? { teamId: teamFilter } : {}
        ].filter(Boolean)
    };

    // Build orderBy clause
    let orderBy: any = { name: 'asc' };
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
        include: {
            team: true,
            policy: {
                select: { id: true, name: true }
            },
            incidents: {
                where: { status: { not: 'RESOLVED' } },
                select: { id: true, urgency: true }
            },
            _count: { select: { incidents: true } }
        },
        orderBy
    });

    // Calculate dynamic status for each service
    let servicesWithStatus = services.map(service => {
        const openIncidents = service.incidents;
        const hasCritical = openIncidents.some(i => i.urgency === 'HIGH');

        const dynamicStatus = hasCritical
            ? 'CRITICAL'
            : openIncidents.length > 0
                ? 'DEGRADED'
                : 'OPERATIONAL';

        return { ...service, dynamicStatus };
    });

    // Apply status filter (client-side since status is calculated)
    if (statusFilter !== 'all') {
        servicesWithStatus = servicesWithStatus.filter(service => service.dynamicStatus === statusFilter);
    }

    // Apply sorting by status if needed (client-side)
    if (sortBy === 'status') {
        const statusOrder = { 'CRITICAL': 0, 'DEGRADED': 1, 'OPERATIONAL': 2 };
        servicesWithStatus.sort((a, b) => {
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
                    borderRadius: '0px'
                }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                        Total Services:
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {servicesWithStatus.length}
                    </span>
                </div>
            </header>

            {/* Create Service Form */}
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
                    borderRadius: '0px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                        <div>
                            <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                                Create New Service
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                You don't have access to create services. Admin or Responder role required.
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
            {servicesWithStatus.length === 0 ? (
                <div className="glass-panel empty-state" style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    background: 'white',
                    borderRadius: '0px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
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
                    {servicesWithStatus.map((service: any) => (
                        <ServiceCard key={service.id} service={service} compact={false} />
                    ))}
                </div>
            )}
        </main>
    );
}
