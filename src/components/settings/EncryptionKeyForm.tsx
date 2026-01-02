'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';
import { saveEncryptionKey } from '@/app/(app)/settings/system/actions';

type Props = {
    hasKey: boolean;
};

type State = {
    error?: string | null;
    success?: boolean;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button className="settings-primary-button" type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save Encryption Key'}
        </button>
    );
}

export default function EncryptionKeyForm({ hasKey }: Props) {
    const [state, formAction] = useActionState<State, FormData>(saveEncryptionKey, {
        error: null,
        success: false,
    });
    const [keyInput, setKeyInput] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isEditing, setIsEditing] = useState(!hasKey); // Default to editing if no key exists

    const generateKey = () => {
        // Generate a random 32-byte hex string
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const hex = Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        setKeyInput(hex);
    };

    return (
        <form action={formAction} className="settings-form-stack">
            {hasKey && (
                <div
                    className="settings-alert"
                    style={{
                        border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <strong>✅ Encryption Key is configured.</strong>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                        Your system is securing secrets. Changing this key will invalidate all currently encrypted data (APIs, SSO secrets, etc).
                    </p>
                </div>
            )}

            <SettingRow
                label="System Encryption Key"
                description="32-byte hex key used to encrypt sensitive database fields."
                helpText="Must be exactly 64 hexadecimal characters."
            >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {!isEditing ? (
                        // View Mode (Masked)
                        <>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    type="password"
                                    value="********************************"
                                    disabled
                                    readOnly
                                    style={{
                                        paddingRight: '2.5rem',
                                        fontFamily: 'monospace',
                                        background: 'var(--bg-secondary)',
                                        cursor: 'not-allowed',
                                        opacity: 0.7
                                    }}
                                />
                                <span
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '0.85em',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 500,
                                        userSelect: 'none'
                                    }}
                                >
                                    LOCKED
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="settings-secondary-button"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                Replace Key
                            </button>
                        </>
                    ) : (
                        // Edit Mode
                        <>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    name="encryptionKey"
                                    placeholder="Enter or generate new key"
                                    value={keyInput}
                                    onChange={e => setKeyInput(e.target.value)}
                                    style={{ paddingRight: '2.5rem', fontFamily: 'monospace' }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.5rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        opacity: 0.6,
                                    }}
                                    aria-label={showKey ? "Hide key" : "Show key"}
                                >
                                    {showKey ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={generateKey}
                                className="settings-secondary-button"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                Generate
                            </button>
                            {hasKey && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setKeyInput('');
                                        setShowKey(false);
                                    }}
                                    className="settings-secondary-button"
                                    aria-label="Cancel"
                                    title="Cancel editing"
                                    style={{ padding: '0 0.75rem' }}
                                >
                                    ✕
                                </button>
                            )}
                        </>
                    )}
                </div>
            </SettingRow>

            {(state?.error || state?.success) && (
                <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
                    {state?.error ? state.error : 'Encryption key saved successfully.'}
                </div>
            )}

            <StickyActionBar>
                <SubmitButton />
            </StickyActionBar>
        </form>
    );
}
