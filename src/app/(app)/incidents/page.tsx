import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getUserPermissions } from '@/lib/rbac';

export const revalidate = 30;

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
    const { filter } = await searchParams;
    const currentFilter = filter || 'all_open';

    const permissions = await getUserPermissions();
    const canCreateIncident = permissions.isResponderOrAbove;
    
    // Get current user for filtering
    const currentUser = await prisma.user.findUnique({ 
        where: { id: permissions.id } 
    });

    let where: any = {};
    if (currentFilter === 'mine') {
        where = {
            assigneeId: currentUser?.id,
            status: { not: 'RESOLVED' }
        };
    } else if (currentFilter === 'all_open') {
        where = { status: { not: 'RESOLVED' } };
    } else if (currentFilter === 'resolved') {
        where = { status: 'RESOLVED' };
    }

    const incidents = await prisma.incident.findMany({
        where,
        include: { service: true, assignee: true },
        orderBy: { createdAt: 'desc' }
    });

    const tabs = [
        { id: 'mine', label: 'Mine' },
        { id: 'all_open', label: 'All Open' },
        { id: 'resolved', label: 'Resolved' },
    ];

    return (
        <main>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Incidents</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Central command for all operative issues.</p>
                </div>
                {canCreateIncident ? (
                    <Link href="/incidents/create" className="glass-button primary" style={{ textDecoration: 'none' }}>
                        Create Incident
                    </Link>
                ) : (
                    <button 
                        type="button" 
                        disabled 
                        className="glass-button primary" 
                        style={{ 
                            textDecoration: 'none', 
                            opacity: 0.6, 
                            cursor: 'not-allowed',
                            position: 'relative'
                        }}
                        title="Responder role or above required to create incidents"
                    >
                        Create Incident
                    </button>
                )}
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                {tabs.map(tab => (
                    <Link
                        key={tab.id}
                        href={`/incidents?filter=${tab.id}`}
                        style={{
                            padding: '0.5rem 1rem',
                            color: currentFilter === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                            borderBottom: currentFilter === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                            fontWeight: currentFilter === tab.id ? 600 : 400
                        }}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {incidents.length === 0 ? (
                    <div className="glass-panel empty-state" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No incidents found matching this filter. Good job!
                    </div>
                ) : incidents.map((incident: any) => (
                    <Link key={incident.id} href={`/incidents/${incident.id}`} className="glass-panel" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '80px 1fr 150px 150px 120px', alignItems: 'center', gap: '1rem', transition: 'background 0.2s' }}>
                        {/* Urgency */}
                        <div style={{
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: incident.urgency === 'HIGH' ? 'var(--danger)' : 'var(--warning)',
                            background: incident.urgency === 'HIGH' ? 'rgba(255, 50, 50, 0.1)' : 'rgba(255, 170, 0, 0.1)',
                            padding: '4px',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                        }}>
                            {incident.urgency}
                        </div>

                        {/* Title & Service */}
                        <div>
                            <div style={{ fontWeight: '600', marginBottom: '0.2rem' }}>{incident.title}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                on <span style={{ color: 'var(--text-primary)' }}>{incident.service.name}</span>
                            </div>
                        </div>

                        {/* Assignee */}
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {incident.assignee ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                                        {incident.assignee.name.charAt(0)}
                                    </div>
                                    {incident.assignee.name.split(' ')[0]}
                                </div>
                            ) : (
                                <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Unassigned</span>
                            )}
                        </div>

                        {/* Created At */}
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {/* Status */}
                        <div style={{ textAlign: 'right' }}>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                background: incident.status === 'RESOLVED' ? 'rgba(0, 255, 128, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                                color: incident.status === 'RESOLVED' ? 'var(--success)' : 'var(--text-primary)'
                            }}>
                                {incident.status}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    );
}
