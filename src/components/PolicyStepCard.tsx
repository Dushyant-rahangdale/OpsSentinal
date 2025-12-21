'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import ConfirmDialog from './ConfirmDialog';

type PolicyStepCardProps = {
    step: {
        id: string;
        stepOrder: number;
        delayMinutes: number;
        targetUser: {
            id: string;
            name: string;
            email: string;
        };
    };
    policyId: string;
    canManagePolicies: boolean;
    updateStep: (stepId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
    deleteStep: (stepId: string) => Promise<{ error?: string } | undefined>;
    moveStep: (stepId: string, direction: 'up' | 'down') => Promise<{ error?: string } | undefined>;
    isFirst: boolean;
    isLast: boolean;
};

export default function PolicyStepCard({
    step,
    policyId,
    canManagePolicies,
    updateStep,
    deleteStep,
    moveStep,
    isFirst,
    isLast
}: PolicyStepCardProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        startTransition(async () => {
            try {
                await deleteStep(step.id);
                showToast('Escalation step deleted successfully', 'success');
                router.refresh();
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Failed to delete step', 'error');
            }
        });
    };

    const handleUpdate = async (formData: FormData) => {
        startTransition(async () => {
            try {
                const result = await updateStep(step.id, formData);
                if (result?.error) {
                    showToast(result.error, 'error');
                } else {
                    showToast('Step updated successfully', 'success');
                    setIsEditing(false);
                    router.refresh();
                }
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Failed to update step', 'error');
            }
        });
    };

    const handleMove = async (direction: 'up' | 'down') => {
        startTransition(async () => {
            try {
                await moveStep(step.id, direction);
                showToast('Step order updated', 'success');
                router.refresh();
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Failed to move step', 'error');
            }
        });
    };

    if (isEditing && canManagePolicies) {
        return (
            <div className="glass-panel" style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '2px solid var(--primary)',
                borderRadius: '12px'
            }}>
                <form action={handleUpdate} style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}>
                            {step.stepOrder + 1}
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Edit Step {step.stepOrder + 1}</h4>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            Notify User
                        </label>
                        <input
                            type="hidden"
                            name="userId"
                            value={step.targetUser.id}
                        />
                        <div style={{
                            padding: '0.6rem',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)'
                        }}>
                            {step.targetUser.name} ({step.targetUser.email})
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            Delay (minutes)
                        </label>
                        <input
                            name="delayMinutes"
                            type="number"
                            min="0"
                            defaultValue={step.delayMinutes}
                            required
                            disabled={isPending}
                            style={{
                                width: '100%',
                                padding: '0.6rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                background: 'white'
                            }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Wait time before this step is executed
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="glass-button primary"
                            style={{ flex: 1 }}
                        >
                            {isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            disabled={isPending}
                            className="glass-button"
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <>
            <div className="glass-panel" style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        flexShrink: 0
                    }}>
                        {step.stepOrder + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                                    {step.targetUser.name}
                                </h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                    {step.targetUser.email}
                                </p>
                            </div>
                            <div style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                background: step.delayMinutes === 0 ? '#e6f4ea' : '#fff3e0',
                                color: step.delayMinutes === 0 ? '#065f46' : '#92400e'
                            }}>
                                {step.delayMinutes === 0 ? 'Immediate' : `+${step.delayMinutes}m`}
                            </div>
                        </div>
                        {step.delayMinutes > 0 && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                                Executes {step.delayMinutes} minute{step.delayMinutes !== 1 ? 's' : ''} after previous step
                            </p>
                        )}
                    </div>
                    {canManagePolicies && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={() => handleMove('up')}
                                disabled={isFirst || isPending}
                                className="glass-button"
                                style={{
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.75rem',
                                    opacity: isFirst ? 0.5 : 1
                                }}
                                title="Move up"
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMove('down')}
                                disabled={isLast || isPending}
                                className="glass-button"
                                style={{
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.75rem',
                                    opacity: isLast ? 0.5 : 1
                                }}
                                title="Move down"
                            >
                                ↓
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                disabled={isPending}
                                className="glass-button"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                title="Edit"
                            >
                                ✏️
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
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
                                title="Delete"
                            >
                                🗑️
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Escalation Step"
                message={`Are you sure you want to delete step ${step.stepOrder + 1}? This will remove ${step.targetUser.name} from the escalation policy.`}
                confirmText="Delete Step"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
}

