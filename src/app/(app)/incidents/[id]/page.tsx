import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { addNote, addWatcher, reassignIncident, removeWatcher, resolveIncidentWithNote, updateIncidentStatus, updateIncidentUrgency } from '../actions';
import Link from 'next/link';
import AssigneePicker from '@/components/AssigneePicker';
import QuickActions from '@/components/QuickActions';

function escapeHtml(input: string) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMarkdown(input: string) {
    let output = escapeHtml(input);
    output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
    output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    output = output.replace(/\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
    output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    output = output.replace(/\n/g, '<br />');
    return { __html: output };
}

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
            watchers: { include: { user: true }, orderBy: { createdAt: 'asc' } }
        }
    });

    if (!incident) notFound();

    const users = await prisma.user.findMany();

    // Server actions
    async function handleReassign(formData: FormData) {
        'use server';
        const newAssigneeId = formData.get('assigneeId') as string;
        await reassignIncident(id, newAssigneeId);
    }

    async function handleAddNote(formData: FormData) {
        'use server';
        const content = formData.get('content') as string;
        await addNote(id, content);
    }

    async function handleAcknowledge() {
        'use server';
        await updateIncidentStatus(id, 'ACKNOWLEDGED');
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
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 60%, #f3f4f6 100%)', border: '1px solid #e6e8ef', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '1rem' }}>←</span> Back to Dashboard
                        </Link>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.7rem', fontWeight: '800', letterSpacing: '-0.02em', color: incident.status === 'RESOLVED' ? 'var(--success)' : 'var(--danger)' }}>
                                #{incident.id.slice(-5).toUpperCase()}
                            </span>
                            <span style={{
                                padding: '0.25rem 0.85rem',
                                borderRadius: '999px',
                                background: incident.status === 'RESOLVED' ? 'linear-gradient(180deg, #eaf7ef 0%, #dff3e7 100%)' : (incident.status === 'ACKNOWLEDGED' ? 'linear-gradient(180deg, #fff7e0 0%, #fff0c2 100%)' : 'linear-gradient(180deg, #feecec 0%, #fddddd 100%)'),
                                color: incident.status === 'RESOLVED' ? 'var(--success)' : (incident.status === 'ACKNOWLEDGED' ? '#b45309' : 'var(--danger)'),
                                fontWeight: '700',
                                fontSize: '0.78rem',
                                border: '1px solid rgba(0,0,0,0.05)'
                            }}>
                                {incident.status}
                            </span>
                            {incident.priority && (
                                <span style={{
                                    padding: '0.2rem 0.65rem',
                                    borderRadius: '999px',
                                    background: 'linear-gradient(180deg, rgba(211,47,47,0.16) 0%, rgba(211,47,47,0.08) 100%)',
                                    color: 'var(--danger)',
                                    fontWeight: '700',
                                    fontSize: '0.75rem',
                                    border: '1px solid rgba(211,47,47,0.2)'
                                }}>
                                    {incident.priority}
                                </span>
                            )}
                        </div>
                        <h1 style={{ fontSize: '2.1rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>{incident.title}</h1>
                        {incident.description && (
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.6 }}>{incident.description}</p>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', background: 'rgba(15, 23, 42, 0.04)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.06)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Created</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {new Date(incident.createdAt).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Incident record
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: incident.status === 'RESOLVED' ? '#16a34a' : (incident.status === 'ACKNOWLEDGED' ? '#f59e0b' : '#ef4444'), boxShadow: '0 0 0 6px rgba(239, 68, 68, 0.08)' }}></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                        Incident Overview
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.9rem' }}>
                    <div style={{ background: 'linear-gradient(180deg, rgba(211,47,47,0.08) 0%, #ffffff 85%)', border: '1px solid rgba(211,47,47,0.18)', borderRadius: '12px', padding: '0.85rem', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #d32f2f 0%, #ff5252 100%)', marginBottom: '0.6rem' }}></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Service</div>
                        <Link href={`/services/${incident.serviceId}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem', marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></span>
                            {incident.service.name}
                        </Link>
                    </div>
                    <div style={{
                        background: 'linear-gradient(180deg, rgba(211,47,47,0.08) 0%, #ffffff 85%)',
                        border: '1px solid rgba(211,47,47,0.18)',
                        borderRadius: '12px',
                        padding: '0.85rem',
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)'
                    }}>
                        <div style={{ height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #d32f2f 0%, #ff5252 100%)', marginBottom: '0.6rem' }}></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Urgency</div>
                        <form action={handleUrgencyChange} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.45rem' }}>
                            <select
                                name="urgency"
                                defaultValue={incident.urgency}
                                style={{ padding: '0.25rem 0.55rem', borderColor: 'rgba(211,47,47,0.25)', borderRadius: '8px', background: '#fff', fontSize: '0.8rem' }}
                            >
                                <option value="HIGH">High</option>
                                <option value="LOW">Low</option>
                            </select>
                            <button
                                className="glass-button"
                                style={{
                                    height: '28px',
                                    padding: '0 0.55rem',
                                    fontSize: '0.75rem',
                                    background: 'linear-gradient(180deg, #feecec 0%, #fbdcdc 100%)',
                                    border: '1px solid rgba(211,47,47,0.25)',
                                    color: '#b71c1c'
                                }}
                            >
                                Update
                            </button>
                        </form>
                    </div>
                    <div style={{ background: 'linear-gradient(180deg, rgba(211,47,47,0.08) 0%, #ffffff 85%)', border: '1px solid rgba(211,47,47,0.18)', borderRadius: '12px', padding: '0.85rem', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #d32f2f 0%, #ff5252 100%)', marginBottom: '0.6rem' }}></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Assignee</div>
                        <div style={{ marginTop: '0.45rem' }}>
                            <AssigneePicker
                                users={users}
                                currentAssigneeId={incident.assigneeId}
                                action={handleReassign}
                                accentColor="#d32f2f"
                                inputBackground="#ffffff"
                                buttonBackground="linear-gradient(180deg, #feecec 0%, #fbdcdc 100%)"
                                buttonBorder="1px solid rgba(211,47,47,0.25)"
                                buttonTextColor="#b71c1c"
                                searchPlaceholder="Search assignee..."
                            />
                        </div>
                    </div>
                    <div style={{ background: 'linear-gradient(180deg, rgba(211,47,47,0.08) 0%, #ffffff 85%)', border: '1px solid rgba(211,47,47,0.18)', borderRadius: '12px', padding: '0.85rem', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
                        <div style={{ height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #d32f2f 0%, #ff5252 100%)', marginBottom: '0.6rem' }}></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Escalation</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                            {incident.service.policy?.name || 'Not configured'}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Main Content */}
                <div>
                    {/* Notes Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e6e8ef', boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.2rem' }}>Notes</h3>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Decision trail and responder context</div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                Collaboration
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            {incident.notes.map(note => {
                                const isResolution = note.content.startsWith('Resolution:');
                                const displayContent = isResolution ? note.content.replace(/^Resolution:\s*/i, '') : note.content;
                                return (
                                <div key={note.id} style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#1f2937', border: '1px solid #e2e8f0' }}>
                                        {note.user.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: '600' }}>{note.user.name}</span>
                                                {isResolution && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                                                        Resolution
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(note.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div
                                            style={{
                                                background: isResolution ? 'linear-gradient(180deg, #fff7ed 0%, #fff3e0 100%)' : '#ffffff',
                                                padding: '0.85rem',
                                                borderRadius: '10px',
                                                border: isResolution ? '1px solid #fed7aa' : '1px solid #e6e8ef',
                                                lineHeight: 1.5
                                            }}
                                            dangerouslySetInnerHTML={formatMarkdown(displayContent)}
                                        />
                                    </div>
                                </div>
                            )})}
                            {incident.notes.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes added yet.</p>}
                        </div>

                        <form action={handleAddNote} style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                name="content"
                                placeholder="Add a note... (supports **bold**, *italic*, `code`, links)"
                                required
                                style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' }}
                            />
                            <button className="glass-button primary">Post Note</button>
                        </form>
                    </div>

                    {/* Timeline */}
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e6e8ef', boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.2rem' }}>Timeline</h3>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event history for this incident</div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                Activity
                            </div>
                        </div>
                        <div style={{ position: 'relative', paddingLeft: '1.25rem', borderLeft: '2px solid #e2e8f0' }}>
                        {incident.events.map(event => (
                            <div key={event.id} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-1.52rem', top: '0.2rem', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', border: '2px solid #94a3b8', boxShadow: '0 0 0 6px #f1f5f9' }}></div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600 }}>
                                    {new Date(event.createdAt).toLocaleTimeString()}
                                </div>
                                <div style={{ background: '#fff', border: '1px solid #e6e8ef', borderRadius: '10px', padding: '0.75rem', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
                                    {event.message}
                                </div>
                            </div>
                        ))}
                        {incident.events.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No timeline events yet.</p>}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e6e8ef', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ fontWeight: '700' }}>Actions</h4>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Controls</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '12px', background: '#fff', border: '1px solid #e6e8ef', marginBottom: '0.9rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status</div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{incident.status}</div>
                            </div>
                            <div style={{
                                padding: '0.2rem 0.7rem',
                                borderRadius: '999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: incident.status === 'RESOLVED' ? 'linear-gradient(180deg, #eaf7ef 0%, #dff3e7 100%)' : (incident.status === 'ACKNOWLEDGED' ? 'linear-gradient(180deg, #fff7e0 0%, #fff0c2 100%)' : 'linear-gradient(180deg, #feecec 0%, #fddddd 100%)'),
                                color: incident.status === 'RESOLVED' ? 'var(--success)' : (incident.status === 'ACKNOWLEDGED' ? '#b45309' : 'var(--danger)'),
                                border: '1px solid rgba(0,0,0,0.05)'
                            }}>
                                {incident.status === 'RESOLVED' ? 'Resolved' : (incident.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Open')}
                            </div>
                        </div>
                        <div style={{ marginBottom: '0.9rem' }}>
                            <QuickActions incidentId={incident.id} serviceId={incident.serviceId} />
                        </div>
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {incident.status !== 'ACKNOWLEDGED' && incident.status !== 'RESOLVED' && (
                                <form action={handleAcknowledge}>
                                    <button
                                        type="submit"
                                        className="glass-button"
                                        style={{
                                            width: '100%',
                                            background: 'linear-gradient(180deg, #fff4cc 0%, #ffe9a8 100%)',
                                            color: '#b45309',
                                            border: '1px solid #f6c453',
                                            boxShadow: '0 10px 20px rgba(245, 158, 11, 0.15)'
                                        }}
                                    >
                                        Acknowledge Incident
                                    </button>
                                </form>
                            )}
                            {incident.status === 'RESOLVED' && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: '#f8fafc', padding: '0.65rem', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                                    Resolution recorded. Add follow-ups in Notes if needed.
                                </div>
                            )}
                        </div>
                    </div>

                    {incident.status !== 'RESOLVED' && (
                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e6e8ef', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ fontWeight: '700' }}>Resolution</h4>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Required</span>
                            </div>
                            <form action={handleResolve} style={{ display: 'grid', gap: '0.75rem' }}>
                                <textarea
                                    name="resolution"
                                    required
                                    minLength={10}
                                    maxLength={1000}
                                    rows={4}
                                    placeholder="Root cause, fix applied, or summary..."
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', resize: 'vertical', background: '#fff' }}
                                />
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    10-1000 chars. Supports **bold**, *italic*, `code`, links.
                                </div>
                                <button type="submit" className="glass-button primary" style={{ width: '100%' }}>
                                    Resolve with Note
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e6e8ef', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ fontWeight: '700' }}>Stakeholders / Watchers</h4>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Visibility</span>
                        </div>
                        <form action={handleAddWatcher} style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
                            <select
                                name="watcherId"
                                defaultValue=""
                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                            >
                                <option value="">Select a user...</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                name="watcherRole"
                                defaultValue="FOLLOWER"
                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                            >
                                <option value="FOLLOWER">Follower</option>
                                <option value="STAKEHOLDER">Stakeholder</option>
                                <option value="EXEC">Exec</option>
                            </select>
                            <button className="glass-button" style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.8rem' }}>
                                Add Watcher
                            </button>
                        </form>

                        {incident.watchers.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No watchers yet.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {incident.watchers.map((watcher) => (
                                    <div key={watcher.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem 0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{watcher.user.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{watcher.role}</div>
                                        </div>
                                        <form action={handleRemoveWatcher}>
                                            <input type="hidden" name="watcherMemberId" value={watcher.id} />
                                            <button className="glass-button" style={{ height: '28px', padding: '0 0.6rem', fontSize: '0.75rem' }}>
                                                Remove
                                            </button>
                                        </form>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
