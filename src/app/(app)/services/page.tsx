import prisma from '@/lib/prisma';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDefaultActorId, logAudit } from '@/lib/audit';

export const revalidate = 30;

async function createService(formData: FormData) {
    'use server';
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

export default async function ServicesPage() {
    const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
    const services = await prisma.service.findMany({
        include: {
            team: true,
            incidents: {
                where: { status: { not: 'RESOLVED' } },
                select: { id: true, urgency: true }
            },
            _count: { select: { incidents: true } }
        },
        orderBy: { name: 'asc' }
    });

    // Calculate dynamic status for each service
    const servicesWithStatus = services.map(service => {
        const openIncidents = service.incidents;
        const hasCritical = openIncidents.some(i => i.urgency === 'HIGH');

        const dynamicStatus = hasCritical
            ? 'CRITICAL'
            : openIncidents.length > 0
                ? 'DEGRADED'
                : 'OPERATIONAL';

        return { ...service, dynamicStatus };
    });

    return (
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Service Directory</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your services and their health.</p>
                </div>
            </header>

            {/* Create Service Form */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'white' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Create New Service</h2>
                <form action={createService} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>Service Name *</label>
                        <input name="name" required placeholder="e.g. API Gateway" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>Description</label>
                        <input name="description" placeholder="Brief description" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>Owner Team</label>
                        <select name="teamId" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                            <option value="">Unassigned</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>Slack Webhook URL (Optional)</label>
                        <input name="slackWebhookUrl" placeholder="https://hooks.slack.com/services/..." style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }} />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>If provided, incidents for this service will post notifications to this channel.</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                        <button type="submit" className="glass-button primary">Create Service</button>
                    </div>
                </form>
            </div>

            {/* Services Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {servicesWithStatus.length === 0 ? (
                    <p className="glass-panel empty-state" style={{ padding: '2rem', gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', background: 'white' }}>
                        No services found. Create one above!
                    </p>
                ) : servicesWithStatus.map((service: any) => (
                    <Link href={`/services/${service.id}`} key={service.id} className="glass-panel" style={{ padding: '1.5rem', display: 'block', background: 'white', textDecoration: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{service.name}</h3>
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: service.dynamicStatus === 'OPERATIONAL' ? '#e6f4ea' : service.dynamicStatus === 'CRITICAL' ? '#fce8e8' : '#fff3e0',
                                color: service.dynamicStatus === 'OPERATIONAL' ? 'var(--success)' : service.dynamicStatus === 'CRITICAL' ? 'var(--danger)' : '#f57c00',
                                fontWeight: '500'
                            }}>
                                {service.dynamicStatus}
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            {service.description || 'No description provided.'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span>Owned by <strong style={{ color: 'var(--text-primary)' }}>{service.team?.name || 'Unassigned'}</strong></span>
                            <span>{service.incidents.length > 0 && `${service.incidents.length} open / `}{service._count.incidents} total incidents</span>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    );
}
