'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateIncidentStatus, addNote, updateIncidentUrgency, reassignIncident, resolveIncidentWithNote } from '@/app/(app)/incidents/actions';

type User = { id: string; name: string; email: string };
type Team = { id: string; name: string };

export default function MobileIncidentActions({
    incidentId,
    status,
    urgency,
    assigneeId,
    currentUserId,
    users,
    teams
}: {
    incidentId: string;
    status: string;
    urgency: string;
    assigneeId: string | null;
    currentUserId: string | null;
    users: User[];
    teams: Team[];
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
    const [showReassign, setShowReassign] = useState(false);
    const [showResolveInput, setShowResolveInput] = useState(false);
    const [note, setNote] = useState('');
    const [resolutionNote, setResolutionNote] = useState('');

    const handleReassign = async (userId: string, teamId?: string) => {
        if (loading) return;
        setLoading(true);
        try {
            await reassignIncident(incidentId, userId, teamId);
            setShowReassign(false);
            router.refresh();
        } catch (error) {
            console.error('Reassign failed:', error);
            alert('Failed to reassign incident');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (loading) return;
        if (!resolutionNote || resolutionNote.trim().length < 10) {
            alert('Resolution note must be at least 10 characters.');
            return;
        }
        setLoading(true);
        try {
            await resolveIncidentWithNote(incidentId, resolutionNote.trim());
            setShowResolveInput(false);
            setResolutionNote('');
            router.refresh();
        } catch (error) {
            console.error('Resolve failed:', error);
            alert(error instanceof Error ? error.message : 'Failed to resolve incident');
        } finally {
            setLoading(false);
        }
    };

    const handleSnooze = async (hours: number) => {
        if (loading) return;
        setLoading(true);
        try {
            await updateIncidentStatus(incidentId, 'SNOOZED');
            // Note: snoozedUntil is handled by the backend if needed
            setShowSnoozeOptions(false);
            router.refresh();
        } catch (error) {
            console.error('Snooze failed:', error);
            alert('Failed to snooze incident');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'ACKNOWLEDGE' | 'RESOLVE' | 'SNOOZE' | 'OPEN') => {
        if (loading) return;
        setLoading(true);
        try {
            if (action === 'ACKNOWLEDGE') {
                await updateIncidentStatus(incidentId, 'ACKNOWLEDGED');
            } else if (action === 'RESOLVE') {
                await updateIncidentStatus(incidentId, 'RESOLVED');
            } else if (action === 'OPEN') {
                await updateIncidentStatus(incidentId, 'OPEN');
            }
            router.refresh();
        } catch (error) {
            console.error('Action failed:', error);
            alert('Failed to update incident');
        } finally {
            setLoading(false);
        }
    };

    const handleUrgencyToggle = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const newUrgency = urgency === 'HIGH' ? 'LOW' : 'HIGH';
            await updateIncidentUrgency(incidentId, newUrgency);
            router.refresh();
        } catch (error) {
            console.error('Failed to update urgency:', error);
            alert('Failed to update urgency');
        } finally {
            setLoading(false);
        }
    }

    const handleTakeOwnership = async () => {
        if (loading || !currentUserId) return;
        setLoading(true);
        try {
            await reassignIncident(incidentId, currentUserId);
            router.refresh();
        } catch (error) {
            console.error('Failed to assign:', error);
            alert('Failed to assign incident');
        } finally {
            setLoading(false);
        }
    }

    const handleAddNote = async () => {
        if (!note.trim() || loading) return;
        setLoading(true);
        try {
            await addNote(incidentId, note);
            setNote('');
            setShowNoteInput(false);
            router.refresh();
        } catch (error) {
            console.error('Failed to add note:', error);
            alert('Failed to add note');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Primary Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {status === 'OPEN' && (
                    <button
                        onClick={() => handleAction('ACKNOWLEDGE')}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'var(--badge-warning-bg)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'var(--badge-warning-text)',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? '...' : 'Acknowledge'}
                    </button>
                )}
                {status !== 'RESOLVED' && (
                    <button
                        onClick={() => setShowResolveInput(!showResolveInput)}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: showResolveInput ? 'var(--color-success)' : 'var(--badge-success-bg)',
                            border: 'none',
                            borderRadius: '8px',
                            color: showResolveInput ? 'white' : 'var(--badge-success-text)',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? '...' : (showResolveInput ? 'Cancel' : 'Resolve')}
                    </button>
                )}
                <button
                    onClick={() => setShowMore(!showMore)}
                    style={{
                        padding: '0.75rem',
                        background: 'var(--badge-neutral-bg)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'var(--badge-neutral-text)',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    {showMore ? 'Less' : 'More...'}
                </button>
            </div>

            {/* Resolution Input Panel */}
            {showResolveInput && (
                <div className="mobile-metric-card" style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: '0 0 0.5rem' }}>
                        Resolution Note <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>*</span>
                    </p>
                    <textarea
                        placeholder="Describe root cause, fix applied, or summary... (min 10 chars)"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            fontSize: '0.85rem',
                            minHeight: '80px',
                            resize: 'vertical',
                            marginBottom: '0.5rem'
                        }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {resolutionNote.length}/1000 characters (min 10)
                    </div>
                    <button
                        onClick={handleResolve}
                        disabled={loading || resolutionNote.trim().length < 10}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: resolutionNote.trim().length >= 10 ? '#16a34a' : '#d1d5db',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: (loading || resolutionNote.trim().length < 10) ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Resolving...' : 'Resolve with Note'}
                    </button>
                </div>
            )}

            {/* More Actions Panel */}
            {showMore && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                }}>
                    <button
                        onClick={() => setShowNoteInput(!showNoteInput)}
                        style={{
                            padding: '0.6rem',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        📝 Add Note
                    </button>

                    <button
                        onClick={handleUrgencyToggle}
                        disabled={loading}
                        style={{
                            padding: '0.6rem',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        ⚠️ {urgency === 'HIGH' ? 'Low' : 'High'} Urgency
                    </button>

                    {(!assigneeId || assigneeId !== currentUserId) && (
                        <button
                            onClick={handleTakeOwnership}
                            disabled={loading}
                            style={{
                                padding: '0.6rem',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            🙋 Take Ownership
                        </button>
                    )}

                    {status !== 'RESOLVED' && status !== 'SNOOZED' && (
                        <button
                            onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                            style={{
                                padding: '0.6rem',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            💤 Snooze
                        </button>
                    )}

                    {status === 'SNOOZED' && (
                        <button
                            onClick={() => handleAction('OPEN')}
                            disabled={loading}
                            style={{
                                padding: '0.6rem',
                                background: 'var(--badge-warning-bg)',
                                border: '1px solid var(--badge-warning-text)',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            🔔 Unsnooze
                        </button>
                    )}

                    <button
                        onClick={() => setShowReassign(!showReassign)}
                        style={{
                            padding: '0.6rem',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        ↔️ Reassign
                    </button>
                </div>
            )}

            {/* Snooze Options */}
            {showSnoozeOptions && (
                <div className="mobile-metric-card">
                    <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: '0 0 0.5rem' }}>Snooze for:</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[1, 4, 24].map(h => (
                            <button
                                key={h}
                                onClick={() => handleSnooze(h)}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    background: 'var(--badge-snoozed-bg)',
                                    border: '1px solid var(--badge-snoozed-text)',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: 'var(--badge-snoozed-text)',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {h}h
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Reassign Panel */}
            {showReassign && (
                <div className="mobile-metric-card">
                    <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: '0 0 0.75rem' }}>Reassign To:</p>

                    {/* Assign to User */}
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                            User
                        </label>
                        <select
                            onChange={(e) => e.target.value && handleReassign(e.target.value)}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                fontSize: '0.85rem',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="">Select a user...</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name || user.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Assign to Team */}
                    <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                            Team
                        </label>
                        <select
                            onChange={(e) => e.target.value && handleReassign('', e.target.value)}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                fontSize: '0.85rem',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="">Select a team...</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setShowReassign(false)}
                        style={{
                            width: '100%',
                            marginTop: '0.5rem',
                            padding: '0.4rem',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {showNoteInput && (
                <div className="mobile-metric-card">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note..."
                        style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            marginBottom: '0.5rem',
                            fontFamily: 'inherit'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setShowNoteInput(false)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddNote}
                            disabled={loading || !note.trim()}
                            style={{
                                padding: '0.4rem 0.8rem',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                opacity: loading || !note.trim() ? 0.5 : 1
                            }}
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
