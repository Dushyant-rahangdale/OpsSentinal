'use client';

import { useState, useEffect } from 'react';
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

    // Fetch Slack channels when Slack is selected
    useEffect(() => {
        if (channels.includes('SLACK') && slackIntegration) {
            setLoadingChannels(true);
            fetch(`/api/slack/channels?serviceId=${serviceId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.channels) {
                        setSlackChannels(data.channels);
                    }
                })
                .catch(err => console.error('Failed to fetch Slack channels:', err))
                .finally(() => setLoadingChannels(false));
        }
    }, [channels, slackIntegration, serviceId]);

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
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z"/>
                        </svg>
                        Slack Integration
                    </label>
                    
                    {slackIntegration ? (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Connected to {slackIntegration.workspaceName || 'Slack workspace'}
                            </p>
                            <a
                                href={`/api/slack/oauth?serviceId=${serviceId}`}
                                className="glass-button"
                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}
                            >
                                Reconnect Workspace
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
                        <div style={{ marginBottom: '1rem' }}>
                            <a
                                href={`/api/slack/oauth?serviceId=${serviceId}`}
                                className="glass-button primary"
                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                Connect Slack Workspace
                            </a>
                        </div>
                    )}

                    {/* Slack Channel Selector */}
                    {slackIntegration && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                Slack Channel
                            </label>
                            {loadingChannels ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading channels...</p>
                            ) : (
                                <select
                                    name="slackChannel"
                                    value={selectedSlackChannel}
                                    onChange={(e) => setSelectedSlackChannel(e.target.value)}
                                    className="focus-border"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px',
                                        fontSize: '0.9rem',
                                        background: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Select a channel...</option>
                                    {slackChannels.map((ch) => (
                                        <option key={ch.id} value={ch.name}>
                                            #{ch.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Select the Slack channel where incident notifications will be posted
                            </p>
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

