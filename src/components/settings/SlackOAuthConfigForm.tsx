'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { saveSlackOAuthConfig } from '@/app/(app)/settings/slack-oauth/actions';

type SlackOAuthConfigFormProps = {
    config: {
        id: string;
        clientId: string;
        enabled: boolean;
        redirectUri: string | null;
        updatedAt: Date;
        updater: {
            id: string;
            name: string;
            email: string;
        };
    } | null;
};

export default function SlackOAuthConfigForm({ config }: SlackOAuthConfigFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <form onSubmit={async (e) => {
                e.preventDefault();
                setIsPending(true);
                try {
                    const formData = new FormData(e.currentTarget);
                    const result = await saveSlackOAuthConfig(formData);
                    if (result?.error) {
                        showToast(result.error, 'error');
                    } else {
                        showToast('Slack OAuth configuration saved successfully', 'success');
                        router.refresh();
                    }
                } catch (error: any) {
                    const errorMessage = error instanceof Error 
                        ? error.message 
                        : typeof error === 'string' 
                            ? error 
                            : error?.toString?.() || 'Failed to save configuration';
                    showToast(errorMessage, 'error');
                    console.error('Slack OAuth config save error:', error);
                } finally {
                    setIsPending(false);
                }
            }}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Info Box */}
                    <div style={{
                        padding: '1rem',
                        background: '#dbeafe',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px'
                    }}>
                        <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
                            <strong>📋 How to get Slack OAuth credentials:</strong>
                            <br />
                            1. Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#1e40af', textDecoration: 'underline' }}>api.slack.com/apps</a>
                            <br />
                            2. Create a new app or select an existing one
                            <br />
                            3. Go to "OAuth & Permissions" in the sidebar
                            <br />
                            4. Copy the "Client ID" and "Client Secret"
                            <br />
                            5. Add redirect URI: <code style={{ background: '#bfdbfe', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/api/slack/oauth/callback</code>
                        </p>
                    </div>

                    {/* Client ID */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                            Client ID *
                        </label>
                        <input
                            name="clientId"
                            type="text"
                            defaultValue={config?.clientId || ''}
                            required
                            placeholder="e.g., 1234567890.1234567890123"
                            className="focus-border"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                background: 'white',
                                fontFamily: 'monospace'
                            }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Your Slack app's Client ID from the OAuth & Permissions page
                        </p>
                    </div>

                    {/* Client Secret */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                            Client Secret *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                name="clientSecret"
                                type={showSecret ? 'text' : 'password'}
                                defaultValue={config ? '••••••••' : ''}
                                required={!config}
                                placeholder={config ? 'Enter new secret to update' : 'e.g., xoxb-...'}
                                className="focus-border"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    paddingRight: '3rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    background: 'white',
                                    fontFamily: 'monospace'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                style={{
                                    position: 'absolute',
                                    right: '0.5rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                {showSecret ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Your Slack app's Client Secret. {config && 'Leave empty to keep current secret.'}
                        </p>
                    </div>

                    {/* Redirect URI (Optional) */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                            Redirect URI (Optional)
                        </label>
                        <input
                            name="redirectUri"
                            type="text"
                            defaultValue={config?.redirectUri || ''}
                            placeholder={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/slack/oauth/callback`}
                            className="focus-border"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                background: 'white',
                                fontFamily: 'monospace'
                            }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Custom redirect URI (defaults to /api/slack/oauth/callback if not specified)
                        </p>
                    </div>

                    {/* Enabled Toggle */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                            <input
                                name="enabled"
                                type="checkbox"
                                defaultChecked={config?.enabled !== false}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                Enable Slack OAuth
                            </span>
                        </label>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginLeft: '2rem' }}>
                            When disabled, Slack workspace connections will not be available
                        </p>
                    </div>

                    {/* Current Config Info */}
                    {config && (
                        <div style={{
                            padding: '1rem',
                            background: '#f3f4f6',
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                        }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                <strong>Last updated:</strong> {new Date(config.updatedAt).toLocaleString()} by {config.updater.name}
                            </p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="glass-button"
                            disabled={isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="glass-button primary"
                            disabled={isPending}
                        >
                            {isPending ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

