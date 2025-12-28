'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import DangerZoneCard from '@/components/settings/DangerZoneCard';

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
        <SettingsSectionCard
            title="Slack integration"
            description="Connect your Slack workspace to receive incident notifications. Once connected, configure channels per service."
        >

            {/* Guided Setup Wizard (Admin Only) */}
            {!isOAuthConfigured && isAdmin && (
                <GuidedSlackSetup />
            )}

            {/* Not Configured Warning (Non-Admin) */}
            {!isOAuthConfigured && !isAdmin && (
                <div className="settings-slack-banner error">
                    <div className="settings-slack-icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h3>Setup Required</h3>
                    <p>
                        Slack integration needs to be configured by an administrator first. Please contact your admin to set up Slack OAuth credentials.
                    </p>
                </div>
            )}

            {/* Integration Status */}
            <div className="settings-slack-card">
                {integration ? (
                    <>
                        {showSuccessMessage && (
                            <div className="settings-alert success">
                                Successfully connected to Slack! You can now configure channels for your services.
                            </div>
                        )}

                        <div className="settings-slack-status">
                            <div className="settings-slack-logo" aria-hidden="true">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z" />
                                    </svg>
                            </div>
                            <div className="settings-slack-meta">
                                <h3>{integration.workspaceName || 'Slack Workspace'}</h3>
                                <p>Connected by {integration.installer.name} - {new Date(integration.updatedAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`settings-slack-pill ${integration.enabled ? 'active' : 'disabled'}`}>
                                {integration.enabled ? 'Active' : 'Disabled'}
                            </span>
                        </div>

                        <div className="settings-slack-actions">
                            <a href="/api/slack/oauth" className="settings-slack-connect">
                                    Reconnect
                            </a>
                        </div>

                        {/* Available Channels */}
                        <div className="settings-slack-channel-card">
                            <h4>Available Channels</h4>
                            {loadingChannels ? (
                                <p className="settings-muted">Loading channels...</p>
                            ) : channels.length === 0 ? (
                                <p className="settings-muted">
                                    No channels found. Make sure the Slack bot is added to the channels you want to use.
                                </p>
                            ) : (
                                <div className="settings-slack-channel-list">
                                    {channels.slice(0, 10).map((ch) => (
                                        <div key={ch.id} className="settings-slack-channel-item">
                                            #{ch.name}
                                        </div>
                                    ))}
                                    {channels.length > 10 && (
                                        <p className="settings-muted">
                                            + {channels.length - 10} more channels
                                        </p>
                                    )}
                                </div>
                            )}
                            <p className="settings-muted">
                                Configure which channel to use for each service in the service settings page.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="settings-slack-center">
                        <div className="settings-slack-empty-icon" aria-hidden="true">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="#6b7280">
                                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z" />
                            </svg>
                        </div>
                        <h3>Connect Your Slack Workspace</h3>
                        <p>
                            Connect Slack to receive incident notifications. You'll be able to choose which channels to use for each service.
                        </p>
                        {isOAuthConfigured ? (
                            <a href="/api/slack/oauth" className="settings-slack-connect">
                                Connect to Slack
                            </a>
                        ) : (
                            <p className="settings-muted">Slack OAuth must be configured first. Use the setup wizard above.</p>
                        )}
                    </div>
                )}
            </div>

            {integration && (
                <DangerZoneCard
                    title="Disconnect Slack"
                    description="Disconnecting removes Slack notifications for all services."
                >
                    <button
                        type="button"
                        onClick={handleDisconnect}
                        className="settings-link-button danger"
                    >
                        Disconnect Slack integration
                    </button>
                </DangerZoneCard>
            )}
        </SettingsSectionCard>
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
        <div className="settings-slack-setup">
            <div className="settings-slack-setup-header">
                <div className="settings-slack-icon info" aria-hidden="true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z" />
                    </svg>
                </div>
                <h2>Connect Slack Workspace</h2>
                <p>Follow these simple steps to connect Slack. Takes less than 2 minutes!</p>
            </div>

            {/* Step Indicator */}
            <div className="settings-slack-stepper">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="settings-slack-step">
                        <div className={`settings-slack-step-number ${step >= s ? 'active' : ''}`}>
                            {step > s ? 'OK' : s}
                        </div>
                        {s < 3 && (
                            <div className={`settings-slack-step-line ${step > s ? 'active' : ''}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Create Slack App */}
            {step === 1 && (
                <div className="settings-slack-step-card">
                    <h3>Step 1: Create a Slack App</h3>
                    <div className="settings-form-grid">
                        <div className="settings-slack-step-section">
                            <p>
                                <strong>1.</strong> Click the button below to open Slack API in a new tab
                            </p>
                            <a
                                href="https://api.slack.com/apps?new_app=1"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="settings-slack-connect"
                            >
                                Create New Slack App
                            </a>
                        </div>

                        <div className="settings-slack-step-section">
                            <p>
                                <strong>2.</strong> Fill in the app details:
                            </p>
                            <ul>
                                <li>App Name: <strong>OpsSentinal</strong> (or any name you prefer)</li>
                                <li>Pick Workspace: Select your Slack workspace</li>
                                <li>Click <strong>"Create App"</strong></li>
                            </ul>
                        </div>

                        <div className="settings-slack-step-note">
                            <strong>Tip:</strong> Keep the Slack API tab open - you'll need it in the next step!
                        </div>
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        className="settings-primary-button settings-slack-full"
                    >
                        I've Created the App &rarr; Next Step
                    </button>
                </div>
            )}

            {/* Step 2: Configure OAuth */}
            {step === 2 && (
                <div className="settings-slack-step-card">
                    <h3>Step 2: Configure OAuth & Get Credentials</h3>

                    <div className="settings-form-grid">
                        {/* Configure OAuth */}
                        <div className="settings-slack-step-section">
                            <h4>2a. Configure OAuth & Permissions</h4>
                            <ol>
                                <li>In your Slack app, click <strong>"OAuth & Permissions"</strong> in the left sidebar</li>
                                <li>Scroll to <strong>"Redirect URLs"</strong> section</li>
                                <li>Click <strong>"Add New Redirect URL"</strong></li>
                                <li>Paste this URL and click <strong>"Add"</strong>:</li>
                            </ol>
                            <div className="settings-slack-code">
                                {redirectUri}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(redirectUri);
                                        alert('Redirect URI copied to clipboard!');
                                    }}
                                    className="settings-slack-copy"
                                    type="button"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        {/* Add Scopes */}
                        <div className="settings-slack-step-section">
                            <h4>2b. Add Bot Token Scopes</h4>
                            <p>
                                Scroll to <strong>"Scopes"</strong> &rarr; <strong>"Bot Token Scopes"</strong> and add these:
                            </p>
                            <div className="settings-slack-scopes">
                                {['chat:write', 'channels:read'].map((scope) => (
                                    <code key={scope} className="settings-slack-scope">
                                        {scope}
                                    </code>
                                ))}
                            </div>
                            <p className="settings-muted">
                                Click "Add an OAuth Scope" and search for each scope above
                            </p>
                        </div>

                        {/* Get Credentials */}
                        <div className="settings-slack-credential">
                            <h4>2c. Copy Your Credentials</h4>
                            <p>Still on the <strong>"OAuth & Permissions"</strong> page, find these at the top:</p>

                            <div className="settings-form-grid">
                                <div>
                                    <label>Client ID</label>
                                    <input
                                        type="text"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        placeholder="e.g., 1234567890.1234567890123"
                                    />
                                    <p>Found at the top of OAuth & Permissions page</p>
                                </div>

                                <div>
                                    <label>Client Secret</label>
                                    <input
                                        type="password"
                                        value={clientSecret}
                                        onChange={(e) => setClientSecret(e.target.value)}
                                        placeholder="Click 'Show' to reveal, then copy"
                                    />
                                    <p>Click "Show" next to Client Secret, then copy and paste here</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="settings-slack-step-actions">
                        <button
                            onClick={() => setStep(1)}
                            className="settings-link-button"
                            type="button"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!clientId || !clientSecret || isSaving}
                            className="settings-primary-button"
                            type="button"
                        >
                            {isSaving ? 'Saving...' : 'Save & Continue ->'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Connect */}
            {step === 3 && (
                <div className="settings-slack-step-card settings-slack-success">
                    <div className="settings-slack-icon success" aria-hidden="true">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h3>Configuration Saved!</h3>
                    <p className="settings-muted">
                        Now connect your Slack workspace to start receiving notifications
                    </p>
                    <a href="/api/slack/oauth" className="settings-slack-connect">
                        Connect to Slack
                    </a>
                </div>
            )}
        </div>
    );
}





