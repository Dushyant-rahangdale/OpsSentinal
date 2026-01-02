'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileBottomSheet from '@/components/mobile/MobileBottomSheet';
import { logger } from '@/lib/logger';
import {
    updateIncidentStatus,
    addNote,
    updateIncidentUrgency,
    reassignIncident,
    resolveIncidentWithNote
} from '@/app/(app)/incidents/actions';

type User = { id: string; name: string; email: string };
type Team = { id: string; name: string };

type SheetMode = 'more' | 'resolve' | 'note' | 'snooze' | 'reassign' | null;

const RESOLUTION_MIN = 10;

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
    const [sheetMode, setSheetMode] = useState<SheetMode>(null);
    const [note, setNote] = useState('');
    const [resolutionNote, setResolutionNote] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const sheetTitle = useMemo(() => {
        switch (sheetMode) {
            case 'resolve':
                return 'Resolve incident';
            case 'note':
                return 'Add note';
            case 'snooze':
                return 'Snooze incident';
            case 'reassign':
                return 'Reassign incident';
            case 'more':
            default:
                return 'More actions';
        }
    }, [sheetMode]);

    const openSheet = (mode: SheetMode) => {
        setSheetMode(mode);
        setErrorMessage('');
    };

    const closeSheet = () => {
        setSheetMode(null);
        setErrorMessage('');
    };

    const handleFailure = (message: string, error: unknown) => {
        setErrorMessage(message);
        logger.error('mobile.incidentAction.failed', { component: 'MobileIncidentActions', error });
    };

    const handleAction = async (action: 'ACKNOWLEDGE' | 'RESOLVE' | 'OPEN') => {
        if (loading) return;
        setLoading(true);
        setErrorMessage('');
        try {
            if (action === 'ACKNOWLEDGE') {
                await updateIncidentStatus(incidentId, 'ACKNOWLEDGED');
            } else if (action === 'RESOLVE') {
                await updateIncidentStatus(incidentId, 'RESOLVED');
            } else if (action === 'OPEN') {
                await updateIncidentStatus(incidentId, 'OPEN');
            }
            closeSheet();
            router.refresh();
        } catch (error) {
            handleFailure('Failed to update incident status', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (loading) return;
        const trimmed = resolutionNote.trim();
        if (trimmed.length < RESOLUTION_MIN) {
            setErrorMessage(`Resolution note must be at least ${RESOLUTION_MIN} characters.`);
            return;
        }
        setLoading(true);
        setErrorMessage('');
        try {
            await resolveIncidentWithNote(incidentId, trimmed);
            setResolutionNote('');
            closeSheet();
            router.refresh();
        } catch (error) {
            handleFailure(error instanceof Error ? error.message : 'Failed to resolve incident', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSnooze = async (hours: number) => {
        if (loading) return;
        setLoading(true);
        setErrorMessage('');
        try {
            await updateIncidentStatus(incidentId, 'SNOOZED');
            await addNote(incidentId, `Snoozed for ${hours}h`);
            closeSheet();
            router.refresh();
        } catch (error) {
            handleFailure('Failed to snooze incident', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUrgencyToggle = async () => {
        if (loading) return;
        setLoading(true);
        setErrorMessage('');
        try {
            const newUrgency = urgency === 'HIGH' ? 'LOW' : 'HIGH';
            await updateIncidentUrgency(incidentId, newUrgency);
            closeSheet();
            router.refresh();
        } catch (error) {
            handleFailure('Failed to update urgency', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTakeOwnership = async () => {
        if (loading || !currentUserId) return;
        setLoading(true);
        setErrorMessage('');
        try {
            await reassignIncident(incidentId, currentUserId);
            closeSheet();
            router.refresh();
        } catch (error) {
            handleFailure('Failed to assign incident', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!note.trim() || loading) {
            setErrorMessage('Add a note before saving.');
            return;
        }
        setLoading(true);
        setErrorMessage('');
        try {
            await addNote(incidentId, note.trim());
            setNote('');
            closeSheet();
            router.refresh();
        } catch (error) {
            handleFailure('Failed to add note', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReassign = async (userId: string, teamId?: string) => {
        if (loading) return;
        setLoading(true);
        setErrorMessage('');
        try {
            await reassignIncident(incidentId, userId, teamId);
            closeSheet();
            router.refresh();
        } catch (error) {
            handleFailure('Failed to reassign incident', error);
        } finally {
            setLoading(false);
        }
    };

    const showBack = sheetMode !== null && sheetMode !== 'more' && sheetMode !== 'resolve';

    const snapPoints = (sheetMode === 'resolve' || sheetMode === 'reassign' || sheetMode === 'note'
        ? ['full']
        : ['content']) satisfies Array<'content' | 'full' | 'half'>;

    return (
        <div className="mobile-incident-actions">
            <div className="mobile-incident-action-row">
                {status === 'OPEN' && (
                    <button
                        onClick={() => handleAction('ACKNOWLEDGE')}
                        disabled={loading}
                        className="mobile-incident-action-button warning"
                    >
                        {loading ? '...' : 'Acknowledge'}
                    </button>
                )}
                {status !== 'RESOLVED' && (
                    <button
                        onClick={() => openSheet('resolve')}
                        disabled={loading}
                        className="mobile-incident-action-button success"
                    >
                        Resolve
                    </button>
                )}
                <button
                    onClick={() => openSheet('more')}
                    className="mobile-incident-action-button neutral"
                >
                    More
                </button>
            </div>

            {errorMessage && sheetMode === null && (
                <div className="mobile-incident-action-error">{errorMessage}</div>
            )}

            <MobileBottomSheet
                isOpen={sheetMode !== null}
                onClose={closeSheet}
                title={sheetTitle}
                snapPoints={snapPoints}
            >
                {showBack && (
                    <button className="mobile-incident-sheet-back" onClick={() => openSheet('more')}>
                        Back to actions
                    </button>
                )}

                {errorMessage && (
                    <div className="mobile-incident-sheet-error">{errorMessage}</div>
                )}

                {sheetMode === 'more' && (
                    <div className="mobile-incident-sheet-grid">
                        <button
                            onClick={() => openSheet('note')}
                            className="mobile-incident-sheet-button"
                        >
                            Add note
                        </button>
                        <button
                            onClick={handleUrgencyToggle}
                            disabled={loading}
                            className="mobile-incident-sheet-button"
                        >
                            {urgency === 'HIGH' ? 'Lower urgency' : 'Raise urgency'}
                        </button>
                        {(!assigneeId || assigneeId !== currentUserId) && (
                            <button
                                onClick={handleTakeOwnership}
                                disabled={loading}
                                className="mobile-incident-sheet-button"
                            >
                                Take ownership
                            </button>
                        )}
                        {status !== 'RESOLVED' && status !== 'SNOOZED' && (
                            <button
                                onClick={() => openSheet('snooze')}
                                className="mobile-incident-sheet-button"
                            >
                                Snooze
                            </button>
                        )}
                        {status === 'SNOOZED' && (
                            <button
                                onClick={() => handleAction('OPEN')}
                                disabled={loading}
                                className="mobile-incident-sheet-button"
                            >
                                Unsnooze
                            </button>
                        )}
                        <button
                            onClick={() => openSheet('reassign')}
                            className="mobile-incident-sheet-button"
                        >
                            Reassign
                        </button>
                    </div>
                )}

                {sheetMode === 'resolve' && (
                    <div className="mobile-incident-sheet-stack">
                        <textarea
                            placeholder="Describe root cause, fix applied, or summary... (min 10 chars)"
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            className="mobile-incident-sheet-textarea"
                        />
                        <div className="mobile-incident-sheet-helper">
                            {resolutionNote.length}/1000 characters (min {RESOLUTION_MIN})
                        </div>
                        <button
                            onClick={handleResolve}
                            disabled={loading || resolutionNote.trim().length < RESOLUTION_MIN}
                            className="mobile-incident-sheet-submit"
                        >
                            {loading ? 'Resolving...' : 'Resolve incident'}
                        </button>
                    </div>
                )}

                {sheetMode === 'note' && (
                    <div className="mobile-incident-sheet-stack">
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note..."
                            className="mobile-incident-sheet-textarea"
                        />
                        <div className="mobile-incident-sheet-actions">
                            <button
                                onClick={() => openSheet('more')}
                                className="mobile-incident-sheet-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddNote}
                                disabled={loading || !note.trim()}
                                className="mobile-incident-sheet-submit"
                            >
                                Save note
                            </button>
                        </div>
                    </div>
                )}

                {sheetMode === 'snooze' && (
                    <div className="mobile-incident-sheet-stack">
                        <p className="mobile-incident-sheet-label">Snooze for</p>
                        <div className="mobile-incident-sheet-grid">
                            {[1, 4, 24].map((hours) => (
                                <button
                                    key={hours}
                                    onClick={() => handleSnooze(hours)}
                                    disabled={loading}
                                    className="mobile-incident-sheet-button"
                                >
                                    {hours}h
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {sheetMode === 'reassign' && (
                    <div className="mobile-incident-sheet-stack">
                        <label className="mobile-incident-sheet-label">Assign to user</label>
                        <select
                            onChange={(e) => e.target.value && handleReassign(e.target.value)}
                            disabled={loading}
                            className="mobile-incident-sheet-select"
                            defaultValue=""
                        >
                            <option value="">Select a user...</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name || user.email}
                                </option>
                            ))}
                        </select>

                        <label className="mobile-incident-sheet-label">Assign to team</label>
                        <select
                            onChange={(e) => e.target.value && handleReassign('', e.target.value)}
                            disabled={loading}
                            className="mobile-incident-sheet-select"
                            defaultValue=""
                        >
                            <option value="">Select a team...</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => handleReassign('', '')}
                            disabled={loading}
                            className="mobile-incident-sheet-secondary"
                        >
                            Unassign
                        </button>
                    </div>
                )}
            </MobileBottomSheet>
        </div>
    );
}
