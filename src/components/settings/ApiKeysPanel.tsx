'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createApiKey, revokeApiKey } from '@/app/(app)/settings/actions';
import CopyButton from './CopyButton';
import ConfirmDialog from './ConfirmDialog';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';

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
        <button className="settings-primary-button" type="submit" disabled={pending}>
            {pending ? 'Creating...' : 'Create API Key'}
        </button>
    );
}

export default function ApiKeysPanel({ keys }: { keys: ApiKey[] }) {
    const [state, formAction] = useActionState<State, FormData>(createApiKey, { error: null, success: false, token: null });
    const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);

    const handleRevoke = async (keyId: string) => {
        const formData = new FormData();
        formData.append('keyId', keyId);
        await revokeApiKey(formData);
        setRevokeKeyId(null);
        window.location.reload();
    };

    return (
        <>
            <form action={formAction} className="settings-form-stack">
                <SettingRow
                    label="Key name"
                    description="Give your API key a descriptive name."
                    helpText="Example: Production automation"
                >
                    <input name="name" placeholder="e.g., Production Automation" required />
                </SettingRow>

                <SettingRow
                    label="Permissions"
                    description="Choose the scopes this key can access."
                >
                    <div className="settings-scope-grid-v2">
                        {[
                            { value: 'events:write', title: 'Events Write', detail: 'Create and update events', defaultChecked: true },
                            { value: 'incidents:read', title: 'Incidents Read', detail: 'View incident data' },
                            { value: 'incidents:write', title: 'Incidents Write', detail: 'Create and update incidents' },
                            { value: 'services:read', title: 'Services Read', detail: 'View service information' },
                            { value: 'schedules:read', title: 'Schedules Read', detail: 'View on-call schedules' }
                        ].map((scope) => (
                            <label key={scope.value} className="settings-scope-pill">
                                <input type="checkbox" name="scopes" value={scope.value} defaultChecked={scope.defaultChecked} />
                                <span>
                                    <strong>{scope.title}</strong>
                                    <small>{scope.detail}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                </SettingRow>

                {(state?.error || state?.token) && (
                    <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
                        {state?.error ? state.error : 'API key created. Copy it now - it will not be shown again.'}
                    </div>
                )}

                {state?.token && (
                    <div className="settings-code-card">
                        <code>{state.token}</code>
                        <CopyButton text={state.token} />
                    </div>
                )}

                <StickyActionBar>
                    <SubmitButton />
                </StickyActionBar>
            </form>

            {keys.length === 0 ? (
                <div className="settings-empty-state-v2">
                    <div className="settings-empty-icon">[key]</div>
                    <h3>No API keys yet</h3>
                    <p>Create your first API key to automate workflows.</p>
                </div>
            ) : (
                <div className="settings-table-card">
                    <div className="settings-table-header">
                        <h3>Active API keys</h3>
                        <p>{keys.length} {keys.length === 1 ? 'key' : 'keys'} configured</p>
                    </div>
                    <div className="settings-table-wrapper">
                        <table className="settings-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Prefix</th>
                                    <th>Scopes</th>
                                    <th>Created</th>
                                    <th>Status</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map((key) => (
                                    <tr key={key.id}>
                                        <td>{key.name}</td>
                                        <td>
                                            <code className="settings-code">{key.prefix}********</code>
                                        </td>
                                        <td>
                                            <div className="settings-tag-list">
                                                {key.scopes.length > 0 ? (
                                                    key.scopes.map((scope) => (
                                                        <span key={scope} className="settings-tag">{scope}</span>
                                                    ))
                                                ) : (
                                                    <span className="settings-tag">No scopes</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{key.createdAt}</td>
                                        <td>
                                            <span className={`settings-status ${key.revokedAt ? 'revoked' : 'active'}`}>
                                                {key.revokedAt ? 'Revoked' : 'Active'}
                                            </span>
                                        </td>
                                        <td>
                                            {!key.revokedAt && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRevokeKeyId(key.id)}
                                                    className="settings-link-button danger"
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={revokeKeyId !== null}
                title="Revoke API Key"
                message="Are you sure you want to revoke this API key? This action cannot be undone and any applications using this key will stop working immediately."
                confirmLabel="Revoke Key"
                cancelLabel="Cancel"
                onConfirm={() => revokeKeyId && handleRevoke(revokeKeyId)}
                onCancel={() => setRevokeKeyId(null)}
                variant="danger"
            />
        </>
    );
}
