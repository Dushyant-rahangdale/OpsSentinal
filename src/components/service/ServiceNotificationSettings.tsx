'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

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
  webhookIntegrations,
}: ServiceNotificationSettingsProps) {
  const [channels, setChannels] = useState<string[]>(serviceNotificationChannels || []);
  const [selectedSlackChannel, setSelectedSlackChannel] = useState(slackChannel || '');
  const [slackChannels, setSlackChannels] = useState<
    Array<{ id: string; name: string; isMember: boolean; isPrivate: boolean }>
  >([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [joinState, setJoinState] = useState<{
    status: 'idle' | 'joining' | 'success' | 'error';
    message: string | null;
    channelId: string | null;
  }>({ status: 'idle', message: null, channelId: null });

  // Fetch Slack channels when Slack is selected or integration exists
  useEffect(() => {
    if (slackIntegration) {
      setLoadingChannels(true); // eslint-disable-line react-hooks/set-state-in-effect
      setChannelsError(null);
      fetch(`/api/slack/channels?serviceId=${encodeURIComponent(serviceId)}`)
        .then(async res => {
          const data = await res.json();
          if (!res.ok) {
            const errorMessage =
              typeof data?.error === 'string' ? data.error : 'Failed to load Slack channels.';
            throw new Error(errorMessage);
          }
          return data;
        })
        .then(data => {
          if (data.channels) {
            setSlackChannels(data.channels);
          }
        })
        .catch(err => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setChannelsError(errorMessage);
          if (err instanceof Error) {
            logger.error('Failed to fetch Slack channels', { error: err.message });
          } else {
            logger.error('Failed to fetch Slack channels', { error: String(err) });
          }
        })
        .finally(() => setLoadingChannels(false));
    }
  }, [slackIntegration]);

  const handleSlackChannelChange = async (channelName: string) => {
    setSelectedSlackChannel(channelName);

    if (!channelName) {
      setJoinState({ status: 'idle', message: null, channelId: null });
      return;
    }

    const channel = slackChannels.find(ch => ch.name === channelName);
    if (!channel) {
      setJoinState({
        status: 'error',
        message: 'Selected channel not found. Refresh the list and try again.',
        channelId: null,
      });
      return;
    }

    if (channel.isMember) {
      setJoinState({
        status: 'success',
        message: `Bot already has access to #${channel.name}.`,
        channelId: channel.id,
      });
      return;
    }

    if (channel.isPrivate) {
      setJoinState({
        status: 'error',
        message: `Private channel. Invite the bot in Slack with /invite @OpsSentinal, then refresh.`,
        channelId: channel.id,
      });
      return;
    }

    setJoinState({
      status: 'joining',
      message: `Adding bot to #${channel.name}...`,
      channelId: channel.id,
    });

    try {
      const response = await fetch('/api/slack/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id, serviceId }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorCode = typeof data?.error === 'string' ? data.error : 'unknown_error';
        const friendlyMessage =
          errorCode === 'missing_scope'
            ? 'Missing Slack scope: channels:join. Update scopes and reconnect the Slack app.'
            : errorCode === 'not_allowed' || errorCode === 'restricted_action'
              ? 'Slack blocked this action. Check app permissions and try again.'
              : errorCode === 'not_in_channel'
                ? 'Bot must be invited for private channels.'
                : 'Failed to add bot to channel.';

        setJoinState({
          status: 'error',
          message: friendlyMessage,
          channelId: channel.id,
        });
        return;
      }

      setSlackChannels(prev =>
        prev.map(ch => (ch.id === channel.id ? { ...ch, isMember: true } : ch))
      );
      setJoinState({
        status: 'success',
        message: `Bot added to #${channel.name}.`,
        channelId: channel.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to join Slack channel', { error: errorMessage });
      setJoinState({
        status: 'error',
        message: 'Failed to add bot to channel. Try again.',
        channelId: channel.id,
      });
    }
  };

  const memberCount = slackChannels.reduce(
    (count, channel) => count + (channel.isMember ? 1 : 0),
    0
  );
  const joinStateStyle =
    joinState.status === 'success'
      ? { background: '#dcfce7', border: '#86efac', color: '#166534' }
      : joinState.status === 'error'
        ? { background: '#fee2e2', border: '#fecaca', color: '#991b1b' }
        : { background: '#dbeafe', border: '#93c5fd', color: '#1d4ed8' };

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
      <div
        style={{
          padding: '1rem',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '0px',
        }}
      >
        <p style={{ fontSize: '0.85rem', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
          <strong>🔔 Service Notifications (ISOLATED):</strong>
          <br />
          Service notifications are completely separate from escalation and user preferences.
          <br />
          They use only the channels configured below and do NOT check user preferences.
        </p>
      </div>

      {/* Service Notification Channels */}
      <div
        style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          padding: '1.5rem',
          borderRadius: '0px',
          border: '1px solid var(--border)',
        }}
      >
        <label
          style={{
            marginBottom: '0.75rem',
            fontWeight: '600',
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            display: 'block',
          }}
        >
          Service Notification Channels
        </label>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '1rem',
            lineHeight: 1.6,
          }}
        >
          Select which channels to use for service-level notifications. These are isolated from
          escalation notifications.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {['SLACK', 'WEBHOOK'].map(channel => (
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
                fontWeight: channels.includes(channel) ? '600' : '400',
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
        <div
          style={{
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            padding: '1.5rem',
            borderRadius: '0px',
            border: '1px solid var(--border)',
          }}
        >
          <label
            style={{
              marginBottom: '0.75rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z" />
            </svg>
            Slack Integration
          </label>

          <div
            style={{
              padding: '0.85rem 1rem',
              background: '#f1f5f9',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              marginBottom: '1rem',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Slack is managed centrally for your workspace. Configure it in{' '}
              <a
                href="/settings/integrations/slack"
                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
              >
                Settings &rarr; Integrations &rarr; Slack
              </a>
              .
            </p>
          </div>

          {slackIntegration ? (
            <div style={{ marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--success)',
                  marginBottom: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Connected to {slackIntegration.workspaceName || 'Slack workspace'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Bot has access to {memberCount} channel{memberCount === 1 ? '' : 's'}. Public
                channels can be auto-added when selected.
              </p>
            </div>
          ) : (
            <div
              style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: '#fff7ed',
                border: '1px solid #fdba74',
                borderRadius: '6px',
              }}
            >
              <p
                style={{
                  fontSize: '0.9rem',
                  color: '#9a3412',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                }}
              >
                Slack is not connected yet.
              </p>
              <p style={{ fontSize: '0.8rem', color: '#9a3412', margin: 0 }}>
                Ask an admin to connect Slack in Settings &rarr; Integrations &rarr; Slack.
              </p>
            </div>
          )}

          {/* Slack Channel Selector */}
          {slackIntegration && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: '6px',
              }}
            >
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                }}
              >
                Select Channel for Notifications
              </label>
              {loadingChannels ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #3b82f6',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  ></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Loading channels from Slack...
                  </p>
                </div>
              ) : channelsError ? (
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--danger)',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '6px',
                  }}
                >
                  {channelsError}
                </p>
              ) : slackChannels.length === 0 ? (
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '6px',
                  }}
                >
                  No channels found. Check Slack scopes and ensure the workspace is connected.
                </p>
              ) : (
                <>
                  <select
                    name="slackChannel"
                    value={selectedSlackChannel}
                    onChange={e => handleSlackChannelChange(e.target.value)}
                    className="focus-border"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      background: 'white',
                      cursor: 'pointer',
                      fontWeight: selectedSlackChannel ? '500' : '400',
                    }}
                  >
                    <option value="">Choose a channel...</option>
                    {slackChannels.map(ch => (
                      <option key={ch.id} value={ch.name}>
                        #{ch.name}
                        {ch.isPrivate ? ' (private)' : ''}
                        {ch.isMember ? '' : ch.isPrivate ? ' (invite bot)' : ' (auto-add)'}
                      </option>
                    ))}
                  </select>
                  {joinState.status !== 'idle' && joinState.message && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.6rem 0.75rem',
                        background: joinStateStyle.background,
                        border: `1px solid ${joinStateStyle.border}`,
                        borderRadius: '6px',
                      }}
                    >
                      <p style={{ fontSize: '0.85rem', color: joinStateStyle.color, margin: 0 }}>
                        {joinState.message}
                      </p>
                    </div>
                  )}
                  {selectedSlackChannel && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.5rem',
                      }}
                    >
                      Notifications will be sent to #{selectedSlackChannel}.
                    </p>
                  )}
                  <p
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}
                  >
                    Public channels can be auto-added. For private channels, invite the bot in Slack
                    before selecting. Save changes after selecting.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Legacy Webhook URL (fallback) */}
          <div
            style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '500',
              }}
            >
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
                background: 'white',
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
        <div
          style={{
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            padding: '1.5rem',
            borderRadius: '0px',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <label
              style={{
                fontWeight: '500',
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
              }}
            >
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
              {webhookIntegrations.map(webhook => (
                <div
                  key={webhook.id}
                  style={{
                    padding: '0.75rem',
                    background: webhook.enabled ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${webhook.enabled ? '#86efac' : '#fca5a5'}`,
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                      {webhook.name} ({webhook.type})
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {webhook.url}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: webhook.enabled ? 'var(--success)' : 'var(--danger)',
                        fontWeight: '600',
                      }}
                    >
                      {webhook.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <a
                      href={`/services/${serviceId}/webhooks/${webhook.id}/edit`}
                      className="glass-button"
                      style={{
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                      }}
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
