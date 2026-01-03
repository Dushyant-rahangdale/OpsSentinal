'use client';

import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import DangerZoneCard from '@/components/settings/DangerZoneCard';
import GuidedSlackSetup from '@/components/settings/GuidedSlackSetup';

interface SlackIntegration {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  scopes: string[];
  installer: {
    id: string;
    name: string;
    email: string;
  };
}

interface SlackIntegrationPageProps {
  integration: SlackIntegration | null;
  isOAuthConfigured: boolean;
  isAdmin: boolean;
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
}

export default function SlackIntegrationPage({
  integration,
  isOAuthConfigured,
  isAdmin,
}: SlackIntegrationPageProps) {
  const router = useRouter();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'connected' | 'invite' | 'auto'>('all');
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [channelsErrorCode, setChannelsErrorCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastChannelsSync, setLastChannelsSync] = useState<Date | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const requiredScopes = ['chat:write', 'channels:read', 'channels:join'];
  const optionalScopes = ['groups:read'];
  const scopeSet = useMemo(() => new Set(integration?.scopes ?? []), [integration]);
  const missingRequiredScopes = requiredScopes.filter(scope => !scopeSet.has(scope));

  // Check if Slack was just connected (from URL param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack_connected') === 'true') {
      setShowSuccessMessage(true);
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setShowSuccessMessage(false), 5000);
      setTimeout(() => router.refresh(), 1000);
    }
  }, [router]);

  const loadChannels = async () => {
    if (!integration) return;
    setLoadingChannels(true);
    setChannelsError(null);
    setChannelsErrorCode(null);
    try {
      const response = await fetch('/api/slack/channels');
      const data = await response.json();
      if (!response.ok) {
        const errorCode = typeof data?.error === 'string' ? data.error : null;
        setChannelsErrorCode(errorCode);
        const errorMessage = errorCode
          ? getSlackChannelErrorMessage(errorCode)
          : 'Failed to load Slack channels.';
        throw new Error(errorMessage);
      }
      if (data.channels) {
        setChannels(data.channels);
        setLastChannelsSync(new Date());
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setChannelsError(errorMessage);
      logger.error('Failed to fetch Slack channels', { error: errorMessage });
    } finally {
      setLoadingChannels(false);
    }
  };

  // Load channels when integration exists
  useEffect(() => {
    if (integration) {
      void loadChannels();
    }
  }, [integration]);

  const handleDisconnect = async () => {
    setActionError(null);
    if (
      confirm(
        'Disconnect Slack integration? This will remove Slack notifications for all services.'
      )
    ) {
      try {
        const response = await fetch('/api/slack/disconnect', { method: 'DELETE' });
        if (!response.ok) {
          throw new Error('Failed to disconnect Slack. Try again.');
        }
        router.refresh();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setActionError(errorMessage);
      }
    }
  };

  const handleReplaceWorkspace = async () => {
    setActionError(null);
    if (
      confirm('Disconnect the current workspace and connect a new one? This affects all services.')
    ) {
      try {
        const response = await fetch('/api/slack/disconnect', { method: 'DELETE' });
        if (!response.ok) {
          throw new Error('Failed to disconnect Slack. Try again.');
        }
        window.location.href = '/api/slack/oauth';
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setActionError(errorMessage);
      }
    }
  };

  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, filter]);

  const getSlackChannelErrorMessage = (errorCode: string) => {
    const normalized = errorCode.toLowerCase();
    if (normalized === 'missing_scope') {
      return 'Slack scopes are missing. Add required scopes and reconnect the app.';
    }
    if (normalized === 'token_revoked' || normalized === 'invalid_auth') {
      return 'Slack token is invalid or revoked. Reconnect the app to refresh access.';
    }
    if (normalized === 'account_inactive') {
      return 'Slack workspace is inactive. Reactivate the workspace or reconnect.';
    }
    if (normalized === 'not_authed') {
      return 'Slack authorization failed. Reconnect the app to reauthorize.';
    }
    return `Slack error: ${errorCode.replace(/_/g, ' ')}`;
  };

  const channelSummary = useMemo(() => {
    const connected = channels.filter(ch => ch.isMember).length;
    const invite = channels.filter(ch => !ch.isMember && ch.isPrivate).length;
    const autoAdd = channels.filter(ch => !ch.isMember && !ch.isPrivate).length;
    return { total: channels.length, connected, invite, autoAdd };
  }, [channels]);

  const filteredChannels = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return channels.filter(ch => {
      const matchesSearch = !searchQuery || ch.name.toLowerCase().includes(lowerQuery);
      if (!matchesSearch) return false;
      if (filter === 'connected') return ch.isMember;
      if (filter === 'invite') return !ch.isMember && ch.isPrivate;
      if (filter === 'auto') return !ch.isMember && !ch.isPrivate;
      return true;
    });
  }, [channels, searchQuery, filter]);

  const visibleChannels = useMemo(() => {
    if (searchQuery) return filteredChannels;
    return filteredChannels.slice(0, visibleCount);
  }, [filteredChannels, searchQuery, visibleCount]);

  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Slack integration"
        description="Connect your Slack workspace to receive incident notifications. Once connected, configure channels per service."
      >
        {/* Guided Setup Wizard (Admin Only) */}
        {!isOAuthConfigured && isAdmin && <GuidedSlackSetup />}

        {/* Configuration Actions */}
        {isOAuthConfigured && isAdmin && (
          <div className="flex justify-end mb-4">
            <button
              onClick={async () => {
                if (
                  confirm(
                    'Are you sure you want to reset the Slack App configuration? This will require you to re-enter Client ID and Secret.'
                  )
                ) {
                  await fetch('/api/settings/slack-oauth', { method: 'DELETE' });
                  window.location.reload();
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 hover:underline"
            >
              Reset App Credentials
            </button>
          </div>
        )}

        {/* Not Configured Warning (Non-Admin) */}
        {!isOAuthConfigured && !isAdmin && (
          <div className="settings-slack-banner error">
            <div className="settings-slack-icon" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3>Setup Required</h3>
            <p>
              Slack integration needs to be configured by an administrator first. Please contact
              your admin to set up Slack OAuth credentials.
            </p>
          </div>
        )}
        {!isOAuthConfigured && isAdmin && (
          <div className="flex justify-end mb-4">
            <a
              href="https://api.slack.com/apps?new_app=1"
              target="_blank"
              rel="noreferrer"
              className="status-page-button"
            >
              Create Slack App
            </a>
          </div>
        )}

        {/* Integration Status */}
        <div className="settings-slack-card">
          {integration ? (
            <>
              {showSuccessMessage && (
                <div className="settings-alert success mb-6">
                  Successfully connected to Slack! You can now configure channels for your services.
                </div>
              )}

              <div className="settings-slack-status-header">
                <div className="settings-slack-identity">
                  <div className="settings-slack-logo large" aria-hidden="true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z" />
                    </svg>
                  </div>
                  <div className="settings-slack-meta">
                    <h3>{integration.workspaceName || 'Slack Workspace'}</h3>
                    <p>
                      Connected by {integration.installer.name} on{' '}
                      {new Date(integration.updatedAt).toLocaleDateString()}
                    </p>
                    <p className="settings-muted">
                      Last updated {new Date(integration.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`settings-slack-pill ${integration.enabled ? 'active' : 'disabled'}`}
                  >
                    {integration.enabled ? 'Active' : 'Disabled'}
                  </span>
                  {isAdmin && (
                    <>
                      <a href="/api/slack/oauth" className="status-page-button">
                        Reconnect
                      </a>
                      <button
                        type="button"
                        onClick={handleReplaceWorkspace}
                        className="status-page-button"
                        style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                      >
                        Replace workspace
                      </button>
                    </>
                  )}
                </div>
              </div>
              {actionError && (
                <div className="settings-slack-banner error" style={{ marginTop: '1rem' }}>
                  <div className="settings-slack-icon" aria-hidden="true">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <h3>Slack action failed</h3>
                  <p>{actionError}</p>
                </div>
              )}
              <p className="settings-muted" style={{ marginTop: '0.75rem' }}>
                To connect a different workspace, disconnect Slack and connect again.
              </p>

              {missingRequiredScopes.length > 0 && (
                <div className="settings-slack-banner error" style={{ marginTop: '1rem' }}>
                  <div className="settings-slack-icon" aria-hidden="true">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <h3>Missing Slack scopes</h3>
                  <p>
                    Add these scopes in Slack and reconnect the app:{' '}
                    {missingRequiredScopes.join(', ')}.
                  </p>
                  {isAdmin && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <a href="/api/slack/oauth" className="status-page-button">
                        Reconnect to refresh scopes
                      </a>
                    </div>
                  )}
                </div>
              )}

              <details className="settings-slack-card" style={{ background: '#f8fafc' }}>
                <summary className="settings-slack-summary">
                  Scope checklist
                  <span className="settings-slack-summary-meta">
                    {missingRequiredScopes.length === 0
                      ? 'All required scopes present'
                      : `${missingRequiredScopes.length} missing`}
                  </span>
                </summary>
                <div className="settings-slack-channel-list">
                  {[...requiredScopes, ...optionalScopes].map(scope => {
                    const isRequired = requiredScopes.includes(scope);
                    const hasScope = scopeSet.has(scope);
                    return (
                      <div key={scope} className="settings-slack-channel-item">
                        <span>{scope}</span>
                        <span className="settings-muted" style={{ marginLeft: 'auto' }}>
                          {hasScope ? 'enabled' : isRequired ? 'required' : 'optional'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="settings-muted">
                  Scope changes only take effect after reconnecting Slack. Private channels need
                  groups:read.
                </p>
              </details>

              {/* Available Channels */}
              <div className="settings-slack-channel-section mt-8">
                <div className="settings-slack-channel-toolbar">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Available Channels
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {channelSummary.total} channels in your workspace
                    </p>
                    <div className="settings-slack-channel-metrics">
                      <span className="settings-slack-metric">
                        {channelSummary.connected} connected
                      </span>
                      <span className="settings-slack-metric">
                        {channelSummary.invite} invite bot
                      </span>
                      <span className="settings-slack-metric">
                        {channelSummary.autoAdd} auto-add
                      </span>
                      <span
                        className={`settings-slack-health ${missingRequiredScopes.length === 0 ? 'ok' : 'warn'}`}
                      >
                        {missingRequiredScopes.length === 0
                          ? 'Scopes healthy'
                          : `${missingRequiredScopes.length} scope${missingRequiredScopes.length === 1 ? '' : 's'} missing`}
                      </span>
                    </div>
                  </div>
                  <div className="settings-slack-channel-actions">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search channels..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="settings-slack-search"
                      />
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      className="status-page-button"
                      onClick={() => void loadChannels()}
                      disabled={loadingChannels}
                    >
                      {loadingChannels ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
                <div className="settings-slack-channel-filters">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'connected', label: 'Connected' },
                    { id: 'invite', label: 'Invite bot' },
                    { id: 'auto', label: 'Auto-add' },
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`settings-slack-filter-button ${filter === option.id ? 'active' : ''}`}
                      onClick={() => setFilter(option.id as typeof filter)}
                    >
                      {option.label}
                    </button>
                  ))}
                  {lastChannelsSync && (
                    <span className="settings-slack-legend-meta">
                      Last sync {lastChannelsSync.toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {channelsError && channels.length > 0 && (
                  <div className="settings-slack-banner error" style={{ marginBottom: '0.75rem' }}>
                    <div className="settings-slack-icon" aria-hidden="true">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div>
                      <h3>Channel sync issue</h3>
                      <p>{channelsError} Showing last successful list.</p>
                      {isAdmin && (
                        <div className="settings-inline-actions" style={{ marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            className="status-page-button"
                            onClick={() => void loadChannels()}
                            disabled={loadingChannels}
                          >
                            {loadingChannels ? 'Retrying...' : 'Retry fetch'}
                          </button>
                          <a href="/api/slack/oauth" className="status-page-button">
                            Reconnect Slack
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {loadingChannels ? (
                  <div className="settings-slack-loading">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span className="text-sm text-slate-500">Loading channels from Slack...</span>
                  </div>
                ) : channelsError && channels.length === 0 ? (
                  <div className="settings-slack-empty-channels">
                    <p className="text-slate-600 font-medium">Unable to load channels</p>
                    <p className="text-slate-500 text-sm mt-1">{channelsError}</p>
                    {isAdmin && (
                      <div className="settings-inline-actions" style={{ marginTop: '0.75rem' }}>
                        <button
                          type="button"
                          className="status-page-button"
                          onClick={() => void loadChannels()}
                          disabled={loadingChannels}
                        >
                          {loadingChannels ? 'Retrying...' : 'Retry fetch'}
                        </button>
                        <a href="/api/slack/oauth" className="status-page-button">
                          Reconnect Slack
                        </a>
                      </div>
                    )}
                    <details className="settings-slack-troubleshoot">
                      <summary className="settings-slack-summary">Troubleshooting tips</summary>
                      <ul>
                        <li>Confirm the workspace is connected and OAuth is enabled.</li>
                        <li>Verify required scopes are added and reinstall the Slack app.</li>
                        <li>Check that the bot token is valid and not revoked.</li>
                      </ul>
                    </details>
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="settings-slack-empty-channels">
                    <p className="text-slate-600 font-medium">
                      {searchQuery ? 'No channels match your search' : 'No channels found'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      {searchQuery ? (
                        <>No channels match "{searchQuery}". Try a different search term.</>
                      ) : (
                        <>
                          Invite the bot to private channels or select a public channel in service
                          settings to auto-add.
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="settings-slack-channel-grid">
                    {visibleChannels.map(ch => (
                      <div
                        key={ch.id}
                        className="settings-slack-channel-card-item settings-slack-channel-row"
                      >
                        <div className="settings-slack-channel-card">
                          <div className="settings-slack-channel-title">
                            <span className="channel-hash">#</span>
                            <span className="channel-name" title={ch.name}>
                              {ch.name}
                            </span>
                          </div>
                          <div className="settings-slack-channel-meta">
                            <span className="settings-slack-channel-type">
                              {ch.isPrivate ? 'Private' : 'Public'}
                            </span>
                            <span className="settings-slack-channel-dot">•</span>
                            <span className="settings-slack-channel-type">
                              {ch.isMember ? 'Bot connected' : 'Bot not connected'}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`settings-slack-pill ${ch.isMember ? 'active' : 'disabled'}`}
                        >
                          {ch.isMember ? 'connected' : ch.isPrivate ? 'invite bot' : 'auto-add'}
                        </span>
                      </div>
                    ))}
                    {!searchQuery && filteredChannels.length > visibleCount && (
                      <div className="settings-slack-channel-more">
                        <button
                          type="button"
                          className="settings-slack-more-button"
                          onClick={() => setVisibleCount(count => count + 50)}
                        >
                          Show next {Math.min(50, filteredChannels.length - visibleCount)}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-3">
                  Private channels require <strong>groups:read</strong> and inviting the bot.
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
                Connect Slack to receive incident notifications. You&apos;ll be able to choose which
                channels to use for each service.
              </p>
              {isOAuthConfigured ? (
                <a href="/api/slack/oauth" className="status-page-button" data-variant="primary">
                  {isAdmin ? 'Connect to Slack' : 'Ask admin to connect'}
                </a>
              ) : (
                <p className="settings-muted">
                  Slack OAuth must be configured first. Use the setup wizard above.
                </p>
              )}
            </div>
          )}
        </div>
      </SettingsSectionCard>

      {integration && (
        <DangerZoneCard
          title="Disconnect Slack"
          description="Disconnecting prevents OpsSentinal from sending notifications to any channels."
        >
          <button
            type="button"
            onClick={handleDisconnect}
            className="status-page-button hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            Disconnect Integration
          </button>
        </DangerZoneCard>
      )}
    </div>
  );
}
