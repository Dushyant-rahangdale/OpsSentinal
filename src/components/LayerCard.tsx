'use client';

import { useTransition, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import ConfirmDialog from './ConfirmDialog';
import { DateTimeInput } from '@/components/ui';

type LayerCardProps = {
    layer: {
        id: string;
        name: string;
        start: Date;
        end: Date | null;
        rotationLengthHours: number;
        users: Array<{
            userId: string;
            position: number;
            user: {
                name: string;
            };
        }>;
    };
    scheduleId: string;
    timeZone: string;
    users: Array<{ id: string; name: string }>;
    canManageSchedules: boolean;
    updateLayer: (layerId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
    deleteLayer: (scheduleId: string, layerId: string) => Promise<{ error?: string } | undefined>;
    addLayerUser: (layerId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
    moveLayerUser: (layerId: string, userId: string, direction: 'up' | 'down') => Promise<{ error?: string } | undefined>;
    removeLayerUser: (layerId: string, userId: string) => Promise<{ error?: string } | undefined>;
};

function formatShortTime(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
        timeZone: timeZone
    }).format(date);
}

function formatDateInput(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function LayerCard({
    layer,
    scheduleId,
    timeZone,
    users,
    canManageSchedules,
    updateLayer,
    deleteLayer,
    addLayerUser,
    moveLayerUser,
    removeLayerUser
}: LayerCardProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Memoize event handlers to prevent unnecessary re-renders
    const handleDelete = useCallback(async () => {
        setShowDeleteConfirm(false);
        startTransition(async () => {
            const result = await deleteLayer(scheduleId, layer.id);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast('Layer deleted successfully', 'success');
                router.refresh();
            }
        });
    }, [scheduleId, layer.id, deleteLayer, showToast, router, startTransition]);

    const handleUpdate = useCallback(async (formData: FormData) => {
        setIsUpdating(true);
        startTransition(async () => {
            const result = await updateLayer(layer.id, formData);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast('Layer updated successfully', 'success');
                router.refresh();
            }
            setIsUpdating(false);
        });
    }, [layer.id, updateLayer, showToast, router, startTransition]);

    const handleAddUser = useCallback(async (formData: FormData) => {
        startTransition(async () => {
            const result = await addLayerUser(layer.id, formData);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                const userId = formData.get('userId') as string;
                const userName = users.find(u => u.id === userId)?.name || 'User';
                showToast(`${userName} added to layer`, 'success');
                router.refresh();
            }
        });
    }, [layer.id, addLayerUser, users, showToast, router, startTransition]);

    const handleMoveUser = useCallback(async (userId: string, direction: 'up' | 'down') => {
        startTransition(async () => {
            const result = await moveLayerUser(layer.id, userId, direction);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast('User position updated', 'success');
                router.refresh();
            }
        });
    }, [layer.id, moveLayerUser, showToast, router, startTransition]);

    const handleRemoveUser = useCallback(async (userId: string) => {
        startTransition(async () => {
            const result = await removeLayerUser(layer.id, userId);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                const userName = layer.users.find(u => u.userId === userId)?.user.name || 'User';
                showToast(`${userName} removed from layer`, 'success');
                router.refresh();
            }
        });
    }, [layer.id, layer.users, removeLayerUser, showToast, router, startTransition]);

    // Memoize availableUsers calculation to avoid recalculation on every render
    const availableUsers = useMemo(() => 
        users.filter(user => 
            !layer.users.some(layerUser => layerUser.userId === user.id)
        ), [users, layer.users]);

    return (
        <>
            <div className="glass-panel" style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                marginBottom: '1rem'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <div>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                        }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {layer.name}
                            </div>
                            <span 
                                title="A layer defines a rotation pattern. Multiple layers can run simultaneously to provide different coverage (e.g., day shift and night shift)."
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: '#e0f2fe',
                                    color: '#0c4a6e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    cursor: 'help',
                                    border: '1px solid #bae6fd'
                                }}
                            >
                                ?
                            </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {formatShortTime(new Date(layer.start), timeZone)} {timeZone} · {layer.rotationLengthHours}h rotation
                            {layer.end ? ` · ends ${formatShortTime(new Date(layer.end), timeZone)}` : ''}
                        </div>
                    </div>
                    {canManageSchedules ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{
                                padding: '0.4rem 0.75rem',
                                background: 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Remove
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            style={{
                                padding: '0.4rem 0.75rem',
                                background: '#f3f4f6',
                                color: '#9ca3af',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                opacity: 0.5,
                                cursor: 'not-allowed'
                            }}
                            title="Admin or Responder role required"
                        >
                            Remove
                        </button>
                    )}
                </div>

                {canManageSchedules ? (
                    <form action={handleUpdate} style={{ marginBottom: '1.5rem', display: 'grid', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    Name
                                </label>
                                <input
                                    name="name"
                                    defaultValue={layer.name}
                                    required
                                    disabled={isUpdating}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        background: 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    Rotation (hours)
                                </label>
                                <input
                                    name="rotationLengthHours"
                                    type="number"
                                    min="1"
                                    defaultValue={layer.rotationLengthHours}
                                    required
                                    disabled={isUpdating}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        background: 'white'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    Start
                                </label>
                                <DateTimeInput
                                    name="start"
                                    value={formatDateInput(new Date(layer.start))}
                                    required
                                    fullWidth
                                    disabled={isUpdating}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    End (optional)
                                </label>
                                <DateTimeInput
                                    name="end"
                                    value={layer.end ? formatDateInput(new Date(layer.end)) : ''}
                                    fullWidth
                                    disabled={isUpdating}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="glass-button"
                            style={{ width: '100%' }}
                        >
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                ) : (
                    <div style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        opacity: 0.7
                    }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                            ⚠️ You don't have access to edit layers. Admin or Responder role required.
                        </p>
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                        Responders ({layer.users.length})
                    </h4>
                    {layer.users.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                            No responders in this layer.
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {layer.users.map((layerUser, index) => (
                                <div
                                    key={layerUser.userId}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{layerUser.user.name}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {canManageSchedules ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveUser(layerUser.userId, 'up')}
                                                    disabled={index === 0 || isPending}
                                                    className="glass-button"
                                                    style={{
                                                        padding: '0.3rem 0.6rem',
                                                        fontSize: '0.75rem',
                                                        opacity: index === 0 ? 0.5 : 1
                                                    }}
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveUser(layerUser.userId, 'down')}
                                                    disabled={index === layer.users.length - 1 || isPending}
                                                    className="glass-button"
                                                    style={{
                                                        padding: '0.3rem 0.6rem',
                                                        fontSize: '0.75rem',
                                                        opacity: index === layer.users.length - 1 ? 0.5 : 1
                                                    }}
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveUser(layerUser.userId)}
                                                    disabled={isPending}
                                                    style={{
                                                        padding: '0.3rem 0.6rem',
                                                        background: 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)',
                                                        color: '#b91c1c',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button type="button" disabled style={{ padding: '0.3rem 0.6rem', opacity: 0.5, cursor: 'not-allowed' }}>↑</button>
                                                <button type="button" disabled style={{ padding: '0.3rem 0.6rem', opacity: 0.5, cursor: 'not-allowed' }}>↓</button>
                                                <button type="button" disabled style={{ padding: '0.3rem 0.6rem', opacity: 0.5, cursor: 'not-allowed' }}>Remove</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {canManageSchedules && availableUsers.length > 0 && (
                    <form action={handleAddUser} style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                            name="userId"
                            required
                            disabled={isPending}
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                background: 'white'
                            }}
                        >
                            <option value="">Add responder</option>
                            {availableUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="glass-button primary"
                        >
                            {isPending ? 'Adding...' : 'Add'}
                        </button>
                    </form>
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Layer"
                message={`Are you sure you want to delete the layer "${layer.name}"? This will remove all responders from this layer. This action cannot be undone.`}
                confirmText="Delete Layer"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
}

