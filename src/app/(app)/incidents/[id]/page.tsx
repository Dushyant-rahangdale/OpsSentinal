import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getUserPermissions } from '@/lib/rbac';
import { addNote, addWatcher, removeWatcher, resolveIncidentWithNote, updateIncidentStatus, updateIncidentUrgency } from '../actions';
import { getPostmortem } from '@/app/(app)/postmortems/actions';
import Link from 'next/link';
import IncidentHeader from '@/components/incident/IncidentHeader';
import IncidentSidebar from '@/components/incident/detail/IncidentSidebar';
import IncidentNotes from '@/components/incident/detail/IncidentNotes';
import IncidentTimeline from '@/components/incident/detail/IncidentTimeline';
import IncidentResolution from '@/components/incident/detail/IncidentResolution';
import IncidentCustomFields from '@/components/IncidentCustomFields';
import { Button } from '@/components/ui';


export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const incident = await prisma.incident.findUnique({
        where: { id },
        include: {
            service: {
                include: {
                    policy: true
                }
            },
            assignee: true,
            events: { orderBy: { createdAt: 'desc' } },
            notes: { include: { user: true }, orderBy: { createdAt: 'desc' } },
            watchers: { include: { user: true }, orderBy: { createdAt: 'asc' } },
            tags: { include: { tag: true }, orderBy: { createdAt: 'asc' } },
            customFieldValues: {
                include: {
                    customField: true,
                },
            }
        }
    });

    if (!incident) notFound();

    const [users, customFields] = await Promise.all([
        prisma.user.findMany(),
        prisma.customField.findMany({ orderBy: { order: 'asc' } }),
    ]);
    const permissions = await getUserPermissions();
    const canManageIncident = permissions.isResponderOrAbove;
    
    // Check if postmortem exists for this incident
    const postmortem = incident.status === 'RESOLVED' 
        ? await getPostmortem(id)
        : null;

    // Server actions

    async function handleAddNote(formData: FormData) {
        'use server';
        const content = formData.get('content') as string;
        await addNote(id, content);
    }

    async function handleAcknowledge() {
        'use server';
        await updateIncidentStatus(id, 'ACKNOWLEDGED');
    }

    async function handleUnacknowledge() {
        'use server';
        await updateIncidentStatus(id, 'OPEN');
    }

    async function handleSnooze() {
        'use server';
        await updateIncidentStatus(id, 'SNOOZED');
    }

    async function handleSuppress() {
        'use server';
        await updateIncidentStatus(id, 'SUPPRESSED');
    }

    async function handleUnsnooze() {
        'use server';
        await updateIncidentStatus(id, 'OPEN');
    }

    async function handleUnsuppress() {
        'use server';
        await updateIncidentStatus(id, 'OPEN');
    }

    async function handleResolve(formData: FormData) {
        'use server';
        const resolution = (formData.get('resolution') as string) || '';
        await resolveIncidentWithNote(id, resolution);
    }

    async function handleUrgencyChange(formData: FormData) {
        'use server';
        const newUrgency = formData.get('urgency') as string;
        await updateIncidentUrgency(id, newUrgency);
    }

    async function handleAddWatcher(formData: FormData) {
        'use server';
        const watcherId = formData.get('watcherId') as string;
        const role = formData.get('watcherRole') as string;
        await addWatcher(id, watcherId, role);
    }

    async function handleRemoveWatcher(formData: FormData) {
        'use server';
        const watcherId = formData.get('watcherMemberId') as string;
        await removeWatcher(id, watcherId);
    }

    return (
        <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <IncidentHeader 
                incident={incident as any} 
                users={users}
                canManage={canManageIncident}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Main Content */}
                <div>
                    {/* Resolution Form */}
                    {incident.status !== 'RESOLVED' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <IncidentResolution
                                incidentId={incident.id}
                                canManage={canManageIncident}
                                onResolve={handleResolve}
                            />
                        </div>
                    )}

                    {/* Postmortem Section */}
                    {incident.status === 'RESOLVED' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div className="glass-panel" style={{ 
                                padding: '1.5rem', 
                                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', 
                                border: '1px solid #e6e8ef', 
                                borderRadius: '0px',
                                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <h4 style={{ fontWeight: '700', marginBottom: '0.25rem' }}>Postmortem</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Document lessons learned and improve incident response
                                        </p>
                                    </div>
                                </div>
                                
                                {postmortem ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                        <div style={{ 
                                            padding: 'var(--spacing-3)', 
                                            background: 'var(--color-success-light)', 
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--color-success)'
                                        }}>
                                            <p style={{ margin: 0, color: 'var(--color-success-dark)', fontSize: 'var(--font-size-sm)' }}>
                                                ✓ Postmortem exists for this incident
                                            </p>
                                        </div>
                                        <Link href={`/postmortems/${id}`}>
                                            <Button variant="primary" fullWidth>
                                                View Postmortem
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <Link href={`/postmortems/${id}`}>
                                        <Button variant="primary" fullWidth>
                                            Create Postmortem
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    <IncidentNotes 
                        notes={incident.notes.map(n => ({
                            id: n.id,
                            content: n.content,
                            user: n.user,
                            createdAt: n.createdAt
                        }))}
                        canManage={canManageIncident}
                        onAddNote={handleAddNote}
                    />

                    <IncidentTimeline 
                        events={incident.events.map(e => ({
                            id: e.id,
                            message: e.message,
                            createdAt: e.createdAt
                        }))}
                        incidentCreatedAt={incident.createdAt}
                        incidentAcknowledgedAt={incident.acknowledgedAt}
                        incidentResolvedAt={incident.resolvedAt}
                    />

                    {/* Custom Fields */}
                    {customFields.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <IncidentCustomFields
                                incidentId={id}
                                customFieldValues={incident.customFieldValues.map(v => ({
                                    id: v.id,
                                    value: v.value,
                                    customField: v.customField,
                                }))}
                                allCustomFields={customFields}
                                canManage={canManageIncident}
                            />
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <IncidentSidebar
                    incident={{
                        id: incident.id,
                        status: incident.status,
                        assigneeId: incident.assigneeId,
                        assignee: incident.assignee,
                        service: incident.service,
                        acknowledgedAt: incident.acknowledgedAt,
                        resolvedAt: incident.resolvedAt,
                        createdAt: incident.createdAt,
                        escalationStatus: incident.escalationStatus,
                        currentEscalationStep: incident.currentEscalationStep,
                        nextEscalationAt: incident.nextEscalationAt
                    }}
                    users={users}
                    watchers={incident.watchers.map(w => ({
                        id: w.id,
                        user: w.user,
                        role: w.role
                    }))}
                    tags={incident.tags.map(t => ({
                        id: t.tag.id,
                        name: t.tag.name,
                        color: t.tag.color
                    }))}
                    canManage={canManageIncident}
                    onAcknowledge={handleAcknowledge}
                    onUnacknowledge={handleUnacknowledge}
                    onSnooze={handleSnooze}
                    onUnsnooze={handleUnsnooze}
                    onSuppress={handleSuppress}
                    onUnsuppress={handleUnsuppress}
                    onAddWatcher={handleAddWatcher}
                    onRemoveWatcher={handleRemoveWatcher}
                />
            </div>
        </main>
    );
}
