'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createApiKey, revokeApiKey } from '@/app/(app)/settings/actions';

type ApiKey = {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    createdAt: string;
    lastUsedAt?: string | null;
    revokedAt?: string | null;
};

type State = {
    error?: string | null;
    success?: boolean;
    token?: string | null;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button className="glass-button primary" type="submit" disabled={pending}>
            {pending ? 'Creating...' : 'Create key'}
        </button>
    );
}

export default function ApiKeysPanel({ keys }: { keys: ApiKey[] }) {
    const [state, formAction] = useFormState<State>(createApiKey, { error: null, success: false, token: null });

    return (
        <div className="settings-panel">
            <form action={formAction} className="settings-field">
                <label>New API key name</label>
                <input name="name" placeholder="Automation key" required />
                <div className="settings-scope-grid">
                    <label>
                        <input type="checkbox" name="scopes" value="events:write" defaultChecked />
                        Events write
                    </label>
                    <label>
                        <input type="checkbox" name="scopes" value="incidents:read" />
                        Incidents read
                    </label>
                    <label>
                        <input type="checkbox" name="scopes" value="incidents:write" />
                        Incidents write
                    </label>
                    <label>
                        <input type="checkbox" name="scopes" value="services:read" />
                        Services read
                    </label>
                    <label>
                        <input type="checkbox" name="scopes" value="schedules:read" />
                        Schedules read
                    </label>
                </div>
                <SubmitButton />
            </form>

            {state?.token && (
                <div className="settings-note" style={{ color: 'var(--text-primary)' }}>
                    <strong>Copy this key now:</strong>
                    <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.75rem', border: '1px dashed var(--border)', borderRadius: '8px', background: '#f8fafc', fontFamily: 'monospace' }}>
                        {state.token}
                    </div>
                </div>
            )}

            {state?.error ? <div className="settings-note" style={{ color: 'var(--danger)' }}>{state.error}</div> : null}
            {state?.success && !state?.token ? <div className="settings-note" style={{ color: 'var(--success)' }}>API key created.</div> : null}

            {keys.length === 0 ? (
                <div className="settings-empty">No API keys yet. Create one to get started.</div>
            ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {keys.map((key) => (
                        <div key={key.id} className="settings-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                            <div>
                                <h3>{key.name}</h3>
                                <p>
                                    {key.prefix}•••• • Created {key.createdAt}
                                    {key.lastUsedAt ? ` • Last used ${key.lastUsedAt}` : ''}
                                </p>
                                <div className="settings-scope-list">
                                    {key.scopes.length > 0 ? key.scopes.map((scope) => (
                                        <span key={scope}>{scope}</span>
                                    )) : <span>no scopes</span>}
                                </div>
                            </div>
                            {key.revokedAt ? (
                                <span className="settings-badge off">Revoked</span>
                            ) : (
                                <form action={revokeApiKey}>
                                    <input type="hidden" name="keyId" value={key.id} />
                                    <button className="glass-button" type="submit">Revoke</button>
                                </form>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
