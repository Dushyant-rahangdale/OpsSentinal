'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { DateTimeInput } from '@/components/ui';

type OverrideFormProps = {
    scheduleId: string;
    users: Array<{ id: string; name: string }>;
    canManageSchedules: boolean;
    createOverride: (scheduleId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
};

export default function OverrideForm({ scheduleId, users, canManageSchedules, createOverride }: OverrideFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            const result = await createOverride(scheduleId, formData);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                const userId = formData.get('userId') as string;
                const userName = users.find(u => u.id === userId)?.name || 'User';
                showToast(`Override created for ${userName}`, 'success');
                router.refresh();
            }
        });
    };

    if (!canManageSchedules) {
        return (
            <div className="glass-panel" style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                opacity: 0.8
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #e5e7eb'
                }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: 'var(--text-secondary)' }}>
                        Overrides
                    </h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>
                    ⚠️ You don't have access to create overrides. Admin or Responder role required.
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>
                    Temporarily replace on-call coverage. Times use your browser local time.
                </p>
                <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                    <form style={{ display: 'grid', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                On-call user
                            </label>
                            <select name="userId" disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                <option value="">Select a responder</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                Replace (optional)
                            </label>
                            <select name="replacesUserId" disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                <option value="">Any user</option>
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    Start
                                </label>
                                <input type="datetime-local" name="start" disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    End
                                </label>
                                <input type="datetime-local" name="end" disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                        </div>
                        <button type="button" disabled className="glass-button primary" style={{ opacity: 0.5 }}>
                            Create override
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            marginBottom: '1.5rem'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                    Overrides
                </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                Temporarily replace on-call coverage. Times use your browser local time.
            </p>
            <form action={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                        On-call user
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
                        <option value="">Select a responder</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                        Replace (optional)
                    </label>
                    <select
                        name="replacesUserId"
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
                        <option value="">Any user</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            Start
                        </label>
                        <DateTimeInput
                            name="start"
                            required
                            fullWidth
                            disabled={isPending}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            End
                        </label>
                        <DateTimeInput
                            name="end"
                            required
                            fullWidth
                            disabled={isPending}
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isPending}
                    className="glass-button primary"
                    style={{ width: '100%' }}
                >
                    {isPending ? 'Creating...' : 'Create Override'}
                </button>
            </form>
        </div>
    );
}

