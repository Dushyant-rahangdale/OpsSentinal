'use client';

import { useState, useEffect, useRef } from 'react';
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
  serviceNotifyOnTriggered: boolean;
  serviceNotifyOnAck: boolean;
  serviceNotifyOnResolved: boolean;
  serviceNotifyOnSlaBreach: boolean;
};

export default function ServiceNotificationSettings({
  serviceId,
  serviceNotificationChannels,
  slackChannel,
  slackWebhookUrl,
  slackIntegration,
  webhookIntegrations,
  serviceNotifyOnTriggered,
  serviceNotifyOnAck,
  serviceNotifyOnResolved,
  serviceNotifyOnSlaBreach,
}: ServiceNotificationSettingsProps) {
  const [channels, setChannels] = useState<string[]>(serviceNotificationChannels || []);
  const [notifyOnTriggered, setNotifyOnTriggered] = useState(serviceNotifyOnTriggered ?? true);
  const [notifyOnAck, setNotifyOnAck] = useState(serviceNotifyOnAck ?? true);
  const [notifyOnResolved, setNotifyOnResolved] = useState(serviceNotifyOnResolved ?? true);
  const [notifyOnSlaBreach, setNotifyOnSlaBreach] = useState(serviceNotifyOnSlaBreach ?? false);
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
  const [testState, setTestState] = useState<{
    testing: boolean;
    result: 'success' | 'error' | null;
  }>({ testing: false, result: null });
  const selectRef = useRef<HTMLSelectElement>(null);

  // Validation effect
  useEffect(() => {
    if (!selectRef.current) return;

    if (!selectedSlackChannel) {
      selectRef.current.setCustomValidity('');
      return;
    }

    const channel = slackChannels.find(ch => ch.name === selectedSlackChannel);
    if (channel && !channel.isMember) {
      selectRef.current.setCustomValidity('Bot must be connected to this channel before saving.');
    } else {
      selectRef.current.setCustomValidity('');
    }
  }, [selectedSlackChannel, slackChannels]);

  const refreshChannels = () => {
    if (!slackIntegration) return;
    setLoadingChannels(true);
    setChannelsError(null);
    fetch(`/api/slack/channels?serviceId=${encodeURIComponent(serviceId)}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load channels');
        return data;
      })
      .then(data => {
        if (data.channels) setSlackChannels(data.channels);
      })
      .catch(err => setChannelsError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingChannels(false));
  };

  const handleTestNotification = async () => {
    const channel = slackChannels.find(ch => ch.name === selectedSlackChannel);
    if (!channel || !channel.isMember) return;
    setTestState({ testing: true, result: null });
    try {
      const res = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id, channelName: channel.name }),
      });
      setTestState({ testing: false, result: res.ok ? 'success' : 'error' });
      setTimeout(() => setTestState({ testing: false, result: null }), 3000);
    } catch {
      setTestState({ testing: false, result: 'error' });
    }
  };

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

  const handleSlackChannelChange = (channelName: string) => {
    setSelectedSlackChannel(channelName);
    setJoinState({ status: 'idle', message: null, channelId: null });

    if (!channelName) return;

    const channel = slackChannels.find(ch => ch.name === channelName);
    if (!channel) return;

    // Just show status information - do NOT auto-join
    if (channel.isMember) {
      setJoinState({
        status: 'success',
        message: `✓ Bot is connected to #${channel.name}. Ready to send notifications.`,
        channelId: channel.id,
      });
    } else if (channel.isPrivate) {
      setJoinState({
        status: 'error',
        message: `⚠️ Bot is NOT connected to #${channel.name}. For private channels, invite the bot in Slack using: /invite @OpsSentinal`,
        channelId: channel.id,
      });
    } else {
      setJoinState({
        status: 'error',
        message: `⚠️ Bot is NOT connected to #${channel.name}. Click "Connect Bot" below to add the bot to this channel.`,
        channelId: channel.id,
      });
    }
  };

  const handleConnectBot = async () => {
    const channel = slackChannels.find(ch => ch.name === selectedSlackChannel);
    if (!channel || channel.isMember || channel.isPrivate) return;

    setJoinState({
      status: 'joining',
      message: `Connecting bot to #${channel.name}...`,
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
        message: `✓ Bot connected to #${channel.name}. Ready to send notifications.`,
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

        <div
          style={{
            marginTop: '1.5rem',
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
          }}
        >
          <label
            style={{
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
            }}
          >
            Notification Events
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={notifyOnTriggered}
                onChange={e => setNotifyOnTriggered(e.target.checked)}
              />
              Notify when incident is <strong>TRIGGERED</strong>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={notifyOnAck}
                onChange={e => setNotifyOnAck(e.target.checked)}
              />
              Notify when incident is <strong>ACKNOWLEDGED</strong>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={notifyOnResolved}
                onChange={e => setNotifyOnResolved(e.target.checked)}
              />
              Notify when incident is <strong>RESOLVED</strong>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={notifyOnSlaBreach}
                onChange={e => setNotifyOnSlaBreach(e.target.checked)}
              />
              Notify on <strong>SLA BREACH</strong> (Warning)
            </label>
          </div>

          {/* Hidden inputs for form submission */}
          <input type="hidden" name="serviceNotifyOnTriggered" value={String(notifyOnTriggered)} />
          <input type="hidden" name="serviceNotifyOnAck" value={String(notifyOnAck)} />
          <input type="hidden" name="serviceNotifyOnResolved" value={String(notifyOnResolved)} />
          <input type="hidden" name="serviceNotifyOnSlaBreach" value={String(notifyOnSlaBreach)} />
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
                style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}
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
                  {/* Channel selector with refresh button */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                    <select
                      ref={selectRef}
                      name="slackChannel"
                      value={selectedSlackChannel}
                      onChange={e => handleSlackChannelChange(e.target.value)}
                      className="focus-border"
                      style={{
                        flex: 1,
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
                          {ch.isPrivate ? ' 🔒' : ''}
                          {ch.isMember ? ' ✓' : ' ⚠️'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={refreshChannels}
                      disabled={loadingChannels}
                      title="Refresh channel list"
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: loadingChannels ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {loadingChannels ? (
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            border: '2px solid #94a3b8',
                            borderTopColor: '#475569',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite',
                          }}
                        />
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#475569"
                          strokeWidth="2"
                        >
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Action buttons row */}
                  {selectedSlackChannel &&
                    (() => {
                      const channel = slackChannels.find(ch => ch.name === selectedSlackChannel);
                      if (channel?.isMember) {
                        return (
                          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => void handleTestNotification()}
                              disabled={testState.testing}
                              style={{
                                padding: '0.5rem 1rem',
                                background:
                                  testState.result === 'success'
                                    ? '#dcfce7'
                                    : testState.result === 'error'
                                      ? '#fee2e2'
                                      : '#f1f5f9',
                                color:
                                  testState.result === 'success'
                                    ? '#166534'
                                    : testState.result === 'error'
                                      ? '#991b1b'
                                      : '#475569',
                                border: `1px solid ${testState.result === 'success' ? '#86efac' : testState.result === 'error' ? '#fecaca' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: testState.testing ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              {testState.testing ? (
                                <>
                                  <span
                                    style={{
                                      width: 12,
                                      height: 12,
                                      border: '2px solid #94a3b8',
                                      borderTopColor: '#475569',
                                      borderRadius: '50%',
                                      animation: 'spin 0.6s linear infinite',
                                    }}
                                  />
                                  Sending...
                                </>
                              ) : testState.result === 'success' ? (
                                '✓ Test Sent!'
                              ) : testState.result === 'error' ? (
                                '✗ Failed'
                              ) : (
                                <>
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M22 2L11 13" />
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                                  </svg>
                                  Send Test
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}

                  {/* Status message */}
                  {joinState.status !== 'idle' && joinState.message && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: joinStateStyle.background,
                        border: `1px solid ${joinStateStyle.border}`,
                        borderRadius: '6px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: joinStateStyle.color,
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {joinState.message}
                      </p>
                    </div>
                  )}

                  {/* Connect Bot button - only for public, non-connected channels */}
                  {selectedSlackChannel &&
                    (() => {
                      const channel = slackChannels.find(ch => ch.name === selectedSlackChannel);
                      if (channel && !channel.isMember && !channel.isPrivate) {
                        return (
                          <button
                            type="button"
                            onClick={() => void handleConnectBot()}
                            disabled={joinState.status === 'joining'}
                            style={{
                              marginTop: '0.75rem',
                              padding: '0.6rem 1.25rem',
                              background: joinState.status === 'joining' ? '#94a3b8' : '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              cursor: joinState.status === 'joining' ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            {joinState.status === 'joining' ? (
                              <>
                                <span
                                  style={{
                                    width: 14,
                                    height: 14,
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'spin 0.6s linear infinite',
                                  }}
                                />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="16" />
                                  <line x1="8" y1="12" x2="16" y2="12" />
                                </svg>
                                Connect Bot to Channel
                              </>
                            )}
                          </button>
                        );
                      }
                      return null;
                    })()}

                  {/* Instructions */}
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  >
                    <p
                      style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}
                    >
                      <strong>How it works:</strong>
                      <br />
                      • ✓ = Bot is connected and ready
                      <br />
                      • ⚠️ = Bot needs to be connected first
                      <br />• For <strong>public channels</strong>: Click "Connect Bot" button above
                      <br />• For <strong>private channels</strong> 🔒: Run{' '}
                      <code
                        style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: 3 }}
                      >
                        /invite @OpsSentinal
                      </code>{' '}
                      in Slack
                    </p>
                  </div>
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
