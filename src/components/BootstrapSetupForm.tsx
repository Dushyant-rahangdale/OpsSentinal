'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { bootstrapAdmin } from '@/app/setup/actions';

type FormState = {
    error?: string | null;
    success?: boolean;
    password?: string | null;
    email?: string | null;
};

export default function BootstrapSetupForm() {
    const [state, formAction] = useFormState<FormState>(bootstrapAdmin, {
        error: null,
        success: false
    });
    const { pending } = useFormStatus();

    return (
        <form
            action={formAction}
            style={{ display: 'grid', gap: '1rem' }}
        >
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Full name
                </label>
                <input
                    name="name"
                    required
                    placeholder="Alice DevOps"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Email
                </label>
                <input
                    name="email"
                    type="email"
                    required
                    placeholder="alice@example.com"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
            </div>
            <button
                type="submit"
                className="glass-button primary"
                disabled={pending}
            >
                {pending ? 'Creating admin…' : 'Generate admin credentials'}
            </button>

            {state?.error && (
                <div style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    color: 'var(--danger)',
                    fontSize: '0.85rem'
                }}>
                    {state.error}
                </div>
            )}

            {state?.success && state.password && state.email && (
                <div style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px dashed var(--border)',
                    fontSize: '0.9rem'
                }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>Admin ready</p>
                    <p style={{ margin: '0.4rem 0', color: 'var(--text-secondary)' }}>
                        Store this password safely and rotate it after creating your own admin user.
                    </p>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        <strong>Email:</strong> {state.email}
                        <br />
                        <strong>Password:</strong> {state.password}
                    </div>
                </div>
            )}
        </form>
    );
}
