'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import ConfirmDialog from './ConfirmDialog';
import { formatDateTime } from '@/lib/timezone';

type Override = {
    id: string;
    start: Date;
    end: Date;
    userId: string;
    replacesUserId: string | null;
    user: { name: string };
    replacesUser: { name: string } | null;
};

type OverrideListProps = {
    overrides: Override[];
    scheduleId: string;
    canManageSchedules: boolean;
    deleteOverride: (scheduleId: string, overrideId: string) => Promise<{ error?: string } | undefined>;
    timeZone: string;
    title: string;
    emptyMessage: string;
};

export default function OverrideList({
    overrides,
    scheduleId,
    canManageSchedules,
    deleteOverride,
    timeZone,
    title,
    emptyMessage
}: OverrideListProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [deleteOverrideId, setDeleteOverrideId] = useState<string | null>(null);

    const handleDelete = async (overrideId: string) => {
        setDeleteOverrideId(null);
        startTransition(async () => {
            const result = await deleteOverride(scheduleId, overrideId);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast('Override deleted successfully', 'success');
                router.refresh();
            }
        });
    };

    return (
        <>
            <div style={{ 
                marginTop: '1.5rem', 
                paddingTop: '1.5rem', 
                borderTop: '2px solid #e2e8f0' 
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <h4 style={{ 
                        fontSize: '1rem', 
                        fontWeight: '600', 
                        margin: 0,
                        color: 'var(--text-primary)' 
                    }}>
                        {title}
                    </h4>
                    {overrides.length > 0 && (
                        <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                            color: '#0c4a6e',
                            border: '1px solid #bae6fd'
                        }}>
                            {overrides.length}
                        </span>
                    )}
                </div>
                {overrides.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                        {emptyMessage}
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {overrides.map((override) => (
                            <div
                                key={override.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    padding: '0.875rem',
                                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                        fontWeight: '600', 
                                        fontSize: '0.9rem', 
                                        marginBottom: '0.4rem', 
                                        color: 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <span style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '700',
                                            fontSize: '0.85rem',
                                            flexShrink: 0
                                        }}>
                                            {override.user.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span>{override.user.name}</span>
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.8rem', 
                                        color: 'var(--text-muted)', 
                                        marginBottom: '0.25rem',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '0.5rem',
                                        alignItems: 'center',
                                        marginLeft: '42px'
                                    }}>
                                        <span style={{
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            background: '#e0f2fe',
                                            color: '#0c4a6e',
                                            fontSize: '0.75rem',
                                            fontWeight: '500'
                                        }}>
                                            {formatDateTime(override.start, timeZone, { format: 'short' })}
                                        </span>
                                        <span>→</span>
                                        <span style={{
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            background: '#e0f2fe',
                                            color: '#0c4a6e',
                                            fontSize: '0.75rem',
                                            fontWeight: '500'
                                        }}>
                                            {formatDateTime(override.end, timeZone, { format: 'short' })}
                                        </span>
                                    </div>
                                    {override.replacesUser && (
                                        <div style={{ 
                                            fontSize: '0.75rem', 
                                            color: 'var(--text-muted)',
                                            marginLeft: '42px',
                                            marginTop: '0.25rem',
                                            fontStyle: 'italic'
                                        }}>
                                            {title.includes('Upcoming') ? 'Replaces' : 'Replaced'} <strong>{override.replacesUser.name}</strong>
                                        </div>
                                    )}
                                </div>
                                {canManageSchedules ? (
                                    <button
                                        type="button"
                                        onClick={() => setDeleteOverrideId(override.id)}
                                        disabled={isPending}
                                        style={{
                                            padding: '0.4rem 0.75rem',
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
                                ) : (
                                    <button
                                        type="button"
                                        disabled
                                        style={{
                                            padding: '0.4rem 0.75rem',
                                            background: '#f3f4f6',
                                            color: '#9ca3af',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            opacity: 0.5,
                                            cursor: 'not-allowed'
                                        }}
                                        title="Admin or Responder role required"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {deleteOverrideId && (
                <ConfirmDialog
                    isOpen={true}
                    title="Delete Override"
                    message="Are you sure you want to delete this override? This action cannot be undone."
                    confirmText="Delete Override"
                    cancelText="Cancel"
                    variant="danger"
                    onConfirm={() => handleDelete(deleteOverrideId)}
                    onCancel={() => setDeleteOverrideId(null)}
                />
            )}
        </>
    );
}

