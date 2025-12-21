import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

import { deleteService } from '../actions';

// Next.js 15: params is a Promise
export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const service = await prisma.service.findUnique({
        where: { id },
        include: {
            team: true,
            policy: {
                include: {
                    steps: {
                        include: { targetUser: true },
                        orderBy: { stepOrder: 'asc' }
                    }
                }
            },
            incidents: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        }
    });

    if (!service) {
        notFound();
    }

    // Bind delete action
    const deleteServiceWithId = deleteService.bind(null, service.id);

    return (
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
            <Link href="/services" style={{ color: 'var(--text-muted)', marginBottom: '2rem', display: 'inline-block', textDecoration: 'none' }}>
                &larr; Back to Services
            </Link>

            {/* Header Section */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            {service.name}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                            {service.description || 'No description provided.'}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: '0.9rem',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontWeight: '600',
                            background: service.status === 'OPERATIONAL' ? '#e6f4ea' : '#fce8e8',
                            color: service.status === 'OPERATIONAL' ? 'var(--success)' : 'var(--danger)',
                            display: 'inline-block',
                            marginBottom: '1rem'
                        }}>
                            {service.status.replace('_', ' ')}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            Owned by <span style={{ color: 'var(--text-primary)' }}>{service.team?.name || 'Unassigned'}</span>
                        </div>
                        {service.policy ? (
                            <div style={{ 
                                padding: '0.4rem 0.6rem',
                                background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#0c4a6e',
                                border: '1px solid #bae6fd'
                            }}>
                                <Link href={`/policies/${service.policy.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: '500' }}>
                                    📋 Escalation: {service.policy.name} ({service.policy.steps.length} {service.policy.steps.length === 1 ? 'step' : 'steps'})
                                </Link>
                            </div>
                        ) : (
                            <div style={{ 
                                padding: '0.4rem 0.6rem',
                                background: '#fef3c7',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#92400e',
                                border: '1px solid #fde68a'
                            }}>
                                ⚠️ No escalation policy assigned
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                    <Link href={`/services/${id}/integrations`} className="glass-button primary">
                        Manage Integrations
                    </Link>
                    <Link href={`/services/${id}/settings`} className="glass-button">
                        ⚙️ Settings
                    </Link>
                    <form action={deleteServiceWithId}>
                        <button type="submit" style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                            Delete Service
                        </button>
                    </form>
                </div>
            </div>

            {/* Recent Incidents Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '600' }}>Recent Incidents</h2>
                <Link href="/incidents/create" className="glass-button">Create Incident</Link>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {service.incidents.length === 0 ? (
                    <p className="glass-panel" style={{ padding: '1.5rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'white' }}>
                        No recent incidents. System is healthy.
                    </p>
                ) : (
                    service.incidents.map((incident: { id: string; title: string; createdAt: Date; status: string }) => (
                        <Link key={incident.id} href={`/incidents/${incident.id}`} style={{ textDecoration: 'none' }}>
                            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                                <div>
                                    <h4 style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{incident.title}</h4>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Opened on {new Date(incident.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    background: incident.status === 'RESOLVED' ? '#e6f4ea' : '#fce8e8',
                                    color: incident.status === 'RESOLVED' ? 'var(--success)' : 'var(--danger)'
                                }}>
                                    {incident.status}
                                </span>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </main>
    );
}
