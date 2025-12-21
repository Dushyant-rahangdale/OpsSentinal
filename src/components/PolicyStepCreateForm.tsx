'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';

type PolicyStepCreateFormProps = {
    policyId: string;
    users: Array<{ id: string; name: string; email: string }>;
    addStep: (policyId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
};

export default function PolicyStepCreateForm({
    policyId,
    users,
    addStep
}: PolicyStepCreateFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            try {
                const result = await addStep(policyId, formData);
                if (result?.error) {
                    showToast(result.error, 'error');
                } else {
                    showToast('Escalation step added successfully', 'success');
                    setShowForm(false);
                    router.refresh();
                }
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Failed to add step', 'error');
            }
        });
    };

    if (!showForm) {
        return (
            <button
                type="button"
                onClick={() => setShowForm(true)}
                className="glass-button primary"
                style={{ width: '100%' }}
            >
                + Add Escalation Step
            </button>
        );
    }

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '2px solid #bae6fd',
            borderRadius: '12px',
            marginTop: '1rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                    Add New Escalation Step
                </h4>
                <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                    }}
                >
                    ×
                </button>
            </div>
            <form action={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                        Notify User *
                    </label>
                    <select
                        name="userId"
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
                    >
                        <option value="">Select a user</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name} ({user.email})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                        Delay (minutes) *
                    </label>
                    <input
                        name="delayMinutes"
                        type="number"
                        min="0"
                        defaultValue="0"
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
                        Wait time before this step is executed. Use 0 for immediate notification.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="glass-button primary"
                        style={{ flex: 1 }}
                    >
                        {isPending ? 'Adding...' : 'Add Step'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowForm(false)}
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

