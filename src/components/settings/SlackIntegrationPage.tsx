'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SlackIntegrationPageProps = {
    integration: {
        id: string;
        workspaceId: string;
        workspaceName: string | null;
        enabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        installer: {
            id: string;
            name: string;
            email: string;
        };
    } | null;
    isOAuthConfigured: boolean;
    isAdmin: boolean;
};

export default function SlackIntegrationPage({
    integration,
    isOAuthConfigured,
    isAdmin
}: SlackIntegrationPageProps) {
    const router = useRouter();
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingChannels, setLoadingChannels] = useState(false);

    // Check if Slack was just connected (from URL param)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('slack_connected') === 'true') {
            setShowSuccessMessage(true);
            // Remove the param from URL
            window.history.replaceState({}, '', window.location.pathname);
            // Hide message after 5 seconds
            setTimeout(() => setShowSuccessMessage(false), 5000);
            // Refresh to get updated integration
            setTimeout(() => router.refresh(), 1000);
        }
    }, [router]);

    // Load channels when integration exists
    useEffect(() => {
        if (integration) {
            setLoadingChannels(true);
            fetch('/api/slack/channels')
                .then(res => res.json())
                .then(data => {
                    if (data.channels) {
                        setChannels(data.channels);
                    }
                })
                .catch(err => console.error('Failed to fetch Slack channels:', err))
                .finally(() => setLoadingChannels(false));
        }
    }, [integration]);

    const handleDisconnect = async () => {
        if (confirm('Disconnect Slack integration? This will remove Slack notifications for all services.')) {
            await fetch('/api/slack/disconnect', { method: 'DELETE' });
            router.refresh();
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Slack Integration
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Connect your Slack workspace to receive incident notifications. Once connected, you can configure which channels to use for each service.
                </p>
            </div>

            {/* Guided Setup Wizard (Admin Only) */}
            {!isOAuthConfigured && isAdmin && (
                <GuidedSlackSetup />
            )}

            {/* Not Configured Warning (Non-Admin) */}
            {!isOAuthConfigured && !isAdmin && (
                <div style={{
                    padding: '1.5rem',
                    background: '#fef2f2',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: '#fee2e2',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: '#991b1b' }}>
                        Setup Required
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: 0, lineHeight: 1.6 }}>
                        Slack integration needs to be configured by an administrator first. Please contact your admin to set up Slack OAuth credentials.
                    </p>
                </div>
            )}

            {/* Integration Status */}
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '1.5rem'
            }}>
                {integration ? (
                    <>
                        {showSuccessMessage && (
                            <div style={{
                                padding: '0.75rem',
                                background: '#d1fae5',
                                border: '1px solid #10b981',
                                borderRadius: '6px',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <p style={{ fontSize: '0.85rem', color: '#065f46', margin: 0, fontWeight: '500' }}>
                                    Successfully connected to Slack! You can now configure channels for your services.
                                </p>
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: '#4A154B',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z"/>
                                    </svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                                        {integration.workspaceName || 'Slack Workspace'}
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                                        Connected by {integration.installer.name} • {new Date(integration.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '0.25rem 0.75rem',
                                    background: integration.enabled ? '#d1fae5' : '#fee2e2',
                                    color: integration.enabled ? '#065f46' : '#991b1b',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                }}>
                                    {integration.enabled ? 'Active' : 'Disabled'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <a
                                    href="/api/slack/oauth"
                                    style={{
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        background: '#4A154B',
                                        color: 'white',
                                        borderRadius: '6px',
                                        fontWeight: '500',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Reconnect
                                </a>
                                <button
                                    type="button"
                                    onClick={handleDisconnect}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'white',
                                        color: 'var(--danger)',
                                        border: '1px solid var(--danger)',
                                        borderRadius: '6px',
                                        fontWeight: '500',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>

                        {/* Available Channels */}
                        <div style={{
                            padding: '1rem',
                            background: '#f8fafc',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginTop: '1.5rem'
                        }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                                Available Channels
                            </h4>
                            {loadingChannels ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading channels...</p>
                            ) : channels.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    No channels found. Make sure the Slack bot is added to the channels you want to use.
                                </p>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {channels.slice(0, 10).map((ch) => (
                                        <div key={ch.id} style={{
                                            padding: '0.5rem',
                                            background: 'white',
                                            border: '1px solid var(--border)',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}>
                                            #{ch.name}
                                        </div>
                                    ))}
                                    {channels.length > 10 && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            + {channels.length - 10} more channels
                                        </p>
                                    )}
                                </div>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                                Configure which channel to use for each service in the service settings page.
                            </p>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: '#f3f4f6',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="#6b7280">
                                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z"/>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            Connect Your Slack Workspace
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            Connect Slack to receive incident notifications. You'll be able to choose which channels to use for each service.
                        </p>
                        {isOAuthConfigured ? (
                            <a
                                href="/api/slack/oauth"
                                style={{
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    background: '#4A154B',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#350d36';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#4A154B';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z"/>
                                </svg>
                                Connect to Slack
                            </a>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Slack OAuth must be configured first. Use the setup wizard above.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Guided Setup Wizard Component
function GuidedSlackSetup() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        if (!clientId || !clientSecret) {
            alert('Please enter both Client ID and Client Secret');
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('clientId', clientId);
            formData.append('clientSecret', clientSecret);
            formData.append('redirectUri', redirectUri);
            formData.append('enabled', 'true');

            const response = await fetch('/api/settings/slack-oauth', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                router.refresh();
                setStep(3);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save configuration');
            }
        } catch (error: any) {
            alert(error.message || 'Failed to save configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const getBaseUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return 'https://yourdomain.com';
    };

    const redirectUri = `${getBaseUrl()}/api/slack/oauth/callback`;

    return (
        <div style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            marginBottom: '1.5rem'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#3b82f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z"/>
                    </svg>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: '#1e40af' }}>
                    Connect Slack Workspace
                </h2>
                <p style={{ fontSize: '0.95rem', color: '#1e3a8a', margin: 0 }}>
                    Follow these simple steps to connect Slack. Takes less than 2 minutes!
                </p>
            </div>

            {/* Step Indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
                {[1, 2, 3].map((s) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: step >= s ? '#3b82f6' : '#cbd5e1',
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                        }}>
                            {step > s ? '✓' : s}
                        </div>
                        {s < 3 && (
                            <div style={{
                                width: '40px',
                                height: '2px',
                                background: step > s ? '#3b82f6' : '#cbd5e1'
                            }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Create Slack App */}
            {step === 1 && (
                <div style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe'
                }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#1e40af' }}>
                        Step 1: Create a Slack App
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{
                            padding: '1rem',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px'
                        }}>
                            <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 0.75rem 0', lineHeight: 1.6 }}>
                                <strong>1.</strong> Click the button below to open Slack API in a new tab
                            </p>
                            <a
                                href="https://api.slack.com/apps?new_app=1"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    background: '#4A154B',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    marginBottom: '0.75rem'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z"/>
                                </svg>
                                Create New Slack App
                            </a>
                        </div>

                        <div style={{
                            padding: '1rem',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px'
                        }}>
                            <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 0.5rem 0', lineHeight: 1.6 }}>
                                <strong>2.</strong> Fill in the app details:
                            </p>
                            <ul style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0 1.5rem', lineHeight: 1.8 }}>
                                <li>App Name: <strong>OpsSure</strong> (or any name you prefer)</li>
                                <li>Pick Workspace: Select your Slack workspace</li>
                                <li>Click <strong>"Create App"</strong></li>
                            </ul>
                        </div>

                        <div style={{
                            padding: '1rem',
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '6px'
                        }}>
                            <p style={{ fontSize: '0.85rem', color: '#166534', margin: 0, lineHeight: 1.6 }}>
                                <strong>✓ Tip:</strong> Keep the Slack API tab open - you'll need it in the next step!
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        style={{
                            padding: '0.75rem 2rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        I've Created the App → Next Step
                    </button>
                </div>
            )}

            {/* Step 2: Configure OAuth */}
            {step === 2 && (
                <div style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe'
                }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#1e40af' }}>
                        Step 2: Configure OAuth & Get Credentials
                    </h3>
                    
                    <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Configure OAuth */}
                        <div style={{
                            padding: '1.5rem',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px'
                        }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.75rem 0', color: '#1e40af' }}>
                                2a. Configure OAuth & Permissions
                            </h4>
                            <ol style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 0 1.5rem', lineHeight: 2 }}>
                                <li>In your Slack app, click <strong>"OAuth & Permissions"</strong> in the left sidebar</li>
                                <li>Scroll to <strong>"Redirect URLs"</strong> section</li>
                                <li>Click <strong>"Add New Redirect URL"</strong></li>
                                <li>Paste this URL and click <strong>"Add"</strong>:</li>
                            </ol>
                            <div style={{
                                margin: '1rem 0',
                                padding: '0.75rem',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                position: 'relative'
                            }}>
                                <code style={{
                                    fontSize: '0.85rem',
                                    color: '#1e40af',
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all',
                                    display: 'block',
                                    paddingRight: '3rem'
                                }}>
                                    {redirectUri}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(redirectUri);
                                        alert('Redirect URI copied to clipboard!');
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        right: '0.5rem',
                                        padding: '0.25rem 0.5rem',
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        {/* Add Scopes */}
                        <div style={{
                            padding: '1.5rem',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px'
                        }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.75rem 0', color: '#1e40af' }}>
                                2b. Add Bot Token Scopes
                            </h4>
                            <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 0.75rem 0', lineHeight: 1.6 }}>
                                Scroll to <strong>"Scopes"</strong> → <strong>"Bot Token Scopes"</strong> and add these:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {['chat:write', 'channels:read'].map((scope) => (
                                    <code key={scope} style={{
                                        padding: '0.5rem 0.75rem',
                                        background: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem',
                                        color: '#1e40af',
                                        fontFamily: 'monospace'
                                    }}>
                                        {scope}
                                    </code>
                                ))}
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                                Click "Add an OAuth Scope" and search for each scope above
                            </p>
                        </div>

                        {/* Get Credentials */}
                        <div style={{
                            padding: '1.5rem',
                            background: '#fef3c7',
                            border: '2px solid #f59e0b',
                            borderRadius: '6px'
                        }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.75rem 0', color: '#92400e' }}>
                                2c. Copy Your Credentials
                            </h4>
                            <p style={{ fontSize: '0.9rem', color: '#78350f', margin: '0 0 1rem 0', lineHeight: 1.6 }}>
                                Still on the <strong>"OAuth & Permissions"</strong> page, find these at the top:
                            </p>
                            
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>
                                        Client ID
                                    </label>
                                    <input
                                        type="text"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        placeholder="e.g., 1234567890.1234567890123"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #f59e0b',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem',
                                            fontFamily: 'monospace',
                                            background: 'white'
                                        }}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#78350f', margin: '0.25rem 0 0 0' }}>
                                        Found at the top of OAuth & Permissions page
                                    </p>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>
                                        Client Secret
                                    </label>
                                    <input
                                        type="password"
                                        value={clientSecret}
                                        onChange={(e) => setClientSecret(e.target.value)}
                                        placeholder="Click 'Show' to reveal, then copy"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #f59e0b',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem',
                                            fontFamily: 'monospace',
                                            background: 'white'
                                        }}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#78350f', margin: '0.25rem 0 0 0' }}>
                                        Click "Show" next to Client Secret, then copy and paste here
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => setStep(1)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'white',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                flex: 1
                            }}
                        >
                            ← Back
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!clientId || !clientSecret || isSaving}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: (!clientId || !clientSecret || isSaving) ? '#cbd5e1' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: (!clientId || !clientSecret || isSaving) ? 'not-allowed' : 'pointer',
                                flex: 2
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save & Continue →'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Connect */}
            {step === 3 && (
                <div style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: '#d1fae5',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: '#1e40af' }}>
                        Configuration Saved!
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.5rem 0', lineHeight: 1.6 }}>
                        Now connect your Slack workspace to start receiving notifications
                    </p>
                    <a
                        href="/api/slack/oauth"
                        style={{
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 2rem',
                            background: '#4A154B',
                            color: 'white',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z"/>
                        </svg>
                        Connect to Slack
                    </a>
                </div>
            )}
        </div>
    );
}


