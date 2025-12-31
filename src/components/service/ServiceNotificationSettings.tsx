'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';

type ServiceNotificationSettingsProps = {
    serviceId: string;
    serviceNotificationChannels: string[];
    slackChannel: string | null;
    slackWebhookUrl: string | null;
    slackIntegration: {
        id: string;
        workspaceName: string | null;
        workspaceId: string;
        enabled: boolean;
    } | null;
    webhookIntegrations: Array<{
        id: string;
        name: string;
        type: string;
        url: string;
        enabled: boolean;
    }>;
};

export default function ServiceNotificationSettings({
    serviceId,
    serviceNotificationChannels,
    slackChannel,
    slackWebhookUrl,
    slackIntegration,
    webhookIntegrations
}: ServiceNotificationSettingsProps) {
    const router = useRouter();
    const [channels, setChannels] = useState<string[]>(serviceNotificationChannels || []);
    const [selectedSlackChannel, setSelectedSlackChannel] = useState(slackChannel || '');
    const [slackChannels, setSlackChannels] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    // Check if Slack was just connected (from URL param)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('slack_connected') === 'true') {
            setShowSuccessMessage(true); // eslint-disable-line react-hooks/set-state-in-effect
            // Auto-enable SLACK channel if not already enabled
            if (!channels.includes('SLACK')) {
                setChannels([...channels, 'SLACK']);
            }
            // Remove the param from URL
            window.history.replaceState({}, '', window.location.pathname);
            // Hide message after 5 seconds
            setTimeout(() => setShowSuccessMessage(false), 5000);
        }
    }, []);

    // Fetch Slack channels when Slack is selected or integration exists
    useEffect(() => {
        if (slackIntegration) {
            setLoadingChannels(true); // eslint-disable-line react-hooks/set-state-in-effect
            fetch(`/api/slack/channels?serviceId=${serviceId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.channels) {
                        setSlackChannels(data.channels);
                        // Auto-select first channel if none selected and channels available
                        if (!selectedSlackChannel && data.channels.length > 0) {
                            setSelectedSlackChannel(data.channels[0].name);
                        }
                    }
                })
                .catch(err => {
                    if (err instanceof Error) {
                        logger.error('Failed to fetch Slack channels', { error: err.message });
                    } else {
                        logger.error('Failed to fetch Slack channels', { error: String(err) });
                    }
                })
                .finally(() => setLoadingChannels(false));
        }
    }, [slackIntegration, serviceId]);

    const handleChannelToggle = (channel: string) => {
        if (channels.includes(channel)) {
            setChannels(channels.filter(c => c !== channel));
        } else {
            setChannels([...channels, channel]);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Info Box - Service Notifications are Isolated */}
            <div style={{
                padding: '1rem',
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '0px'
            }}>
                <p style={{ fontSize: '0.85rem', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                    <strong>🔔 Service Notifications (ISOLATED):</strong>
                    <br />
                    Service notifications are completely separate from escalation and user preferences.
                    <br />
                    They use only the channels configured below and do NOT check user preferences.
                </p>
            </div>

            {/* Service Notification Channels */}
            <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                padding: '1.5rem',
                borderRadius: '0px',
                border: '1px solid var(--border)'
            }}>
                <label style={{
                    marginBottom: '0.75rem',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    display: 'block'
                }}>
                    Service Notification Channels
                </label>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    Select which channels to use for service-level notifications. These are isolated from escalation notifications.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {['SLACK', 'WEBHOOK'].map((channel) => (
                        <label
                            key={channel}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: channels.includes(channel) ? '#e0f2fe' : 'white',
                                border: `1px solid ${channels.includes(channel) ? '#3b82f6' : 'var(--border)'}`,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: channels.includes(channel) ? '600' : '400'
                            }}
                        >
                            <input
                                type="checkbox"
                                name="serviceNotificationChannels"
                                value={channel}
                                checked={channels.includes(channel)}
                                onChange={() => handleChannelToggle(channel)}
                                style={{ cursor: 'pointer' }}
                            />
                            {channel}
                        </label>
                    ))}
                </div>
            </div>

            {/* Slack Integration */}
            {channels.includes('SLACK') && (
                <div style={{
                    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                    padding: '1.5rem',
                    borderRadius: '0px',
                    border: '1px solid var(--border)'
                }}>
                    <label style={{
                        marginBottom: '0.75rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.95rem',
                        color: 'var(--text-primary)'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z" />
                        </svg>
                        Slack Integration
                    </label>

                    {slackIntegration ? (
                        <div style={{ marginBottom: '1rem' }}>
                            {showSuccessMessage && (
                                <div style={{
                                    padding: '0.75rem',
                                    background: '#d1fae5',
                                    border: '1px solid #10b981',
                                    borderRadius: '6px',
                                    marginBottom: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <p style={{ fontSize: '0.85rem', color: '#065f46', margin: 0, fontWeight: '500' }}>
                                        Successfully connected to Slack! Now select a channel below.
                                    </p>
                                </div>
                            )}
                            <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Connected to {slackIntegration.workspaceName || 'Slack workspace'}
                            </p>
                            <a
                                href={`/api/slack/oauth?serviceId=${serviceId}`}
                                style={{
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginRight: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    background: '#4A154B',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontWeight: '500',
                                    fontSize: '0.85rem',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Reconnect
                            </a>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (confirm('Disconnect Slack integration?')) {
                                        await fetch(`/api/slack/disconnect?serviceId=${serviceId}`, { method: 'DELETE' });
                                        router.refresh();
                                    }
                                }}
                                className="glass-button"
                                style={{ color: 'var(--danger)' }}
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: '500' }}>
                                Connect your Slack workspace to receive incident notifications
                            </p>
                            <a
                                href={`/api/slack/oauth?serviceId=${serviceId}`}
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
                                    border: 'none',
                                    cursor: 'pointer',
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z" />
                                </svg>
                                Connect to Slack
                            </a>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                                You'll be redirected to Slack to authorize. This is a one-time setup - after authorization, you can select which channel to use for notifications.
                            </p>
                        </div>
                    )}

                    {/* Slack Channel Selector */}
                    {slackIntegration && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', border: '1px solid #3b82f6', borderRadius: '6px' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                Select Channel for Notifications
                            </label>
                            {loadingChannels ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'white', borderRadius: '6px' }}>
                                    <div style={{ width: '16px', height: '16px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Loading channels from Slack...</p>
                                </div>
                            ) : slackChannels.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', background: 'white', borderRadius: '6px' }}>
                                    No channels found. Make sure the Slack bot is added to the channels you want to use.
                                </p>
                            ) : (
                                <>
                                    <select
                                        name="slackChannel"
                                        value={selectedSlackChannel}
                                        onChange={(e) => setSelectedSlackChannel(e.target.value)}
                                        className="focus-border"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem',
                                            background: 'white',
                                            cursor: 'pointer',
                                            fontWeight: selectedSlackChannel ? '500' : '400'
                                        }}
                                    >
                                        <option value="">Choose a channel...</option>
                                        {slackChannels.map((ch) => (
                                            <option key={ch.id} value={ch.name}>
                                                #{ch.name}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedSlackChannel && (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Notifications will be sent to #{selectedSlackChannel}
                                        </p>
                                    )}
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        Select the Slack channel where incident notifications will be posted. Don't forget to save your changes below.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Legacy Webhook URL (fallback) */}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            Slack Webhook URL (Legacy - Optional)
                        </label>
                        <input
                            name="slackWebhookUrl"
                            defaultValue={slackWebhookUrl || ''}
                            placeholder="https://hooks.slack.com/services/..."
                            className="focus-border"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: '0px',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                background: 'white'
                            }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Use this if you prefer webhook over OAuth integration
                        </p>
                    </div>
                </div>
            )}

            {/* Webhook Integrations */}
            {channels.includes('WEBHOOK') && (
                <div style={{
                    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                    padding: '1.5rem',
                    borderRadius: '0px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <label style={{
                            fontWeight: '500',
                            fontSize: '0.95rem',
                            color: 'var(--text-primary)'
                        }}>
                            Webhook Integrations
                        </label>
                        <a
                            href={`/services/${serviceId}/webhooks/new`}
                            className="glass-button primary"
                            style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                        >
                            + Add Webhook
                        </a>
                    </div>
                    {webhookIntegrations.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No webhook integrations configured
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {webhookIntegrations.map((webhook) => (
                                <div
                                    key={webhook.id}
                                    style={{
                                        padding: '0.75rem',
                                        background: webhook.enabled ? '#f0fdf4' : '#fef2f2',
                                        border: `1px solid ${webhook.enabled ? '#86efac' : '#fca5a5'}`,
                                        borderRadius: '6px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                            {webhook.name} ({webhook.type})
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                            {webhook.url}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: webhook.enabled ? 'var(--success)' : 'var(--danger)',
                                            fontWeight: '600'
                                        }}>
                                            {webhook.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <a
                                            href={`/services/${serviceId}/webhooks/${webhook.id}/edit`}
                                            className="glass-button"
                                            style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                        >
                                            Edit
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

