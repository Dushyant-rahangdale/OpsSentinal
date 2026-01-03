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

  // Check if Slack was just connected (from URL param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack_connected') === 'true') {
      setShowSuccessMessage(true); // eslint-disable-line react-hooks/set-state-in-effect
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setShowSuccessMessage(false), 5000);
      setTimeout(() => router.refresh(), 1000);
    }
  }, [router]);

  // Load channels when integration exists
  useEffect(() => {
    if (integration) {
      setLoadingChannels(true); // eslint-disable-line react-hooks/set-state-in-effect
      fetch('/api/slack/channels')
        .then(res => res.json())
        .then(data => {
          if (data.channels) {
            setChannels(data.channels);
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
  }, [integration]);

  const handleDisconnect = async () => {
    if (
      confirm(
        'Disconnect Slack integration? This will remove Slack notifications for all services.'
      )
    ) {
      await fetch('/api/slack/disconnect', { method: 'DELETE' });
      router.refresh();
    }
  };

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const lowerQuery = searchQuery.toLowerCase();
    return channels.filter(ch => ch.name.toLowerCase().includes(lowerQuery));
  }, [channels, searchQuery]);

  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Slack integration"
        description="Connect your Slack workspace to receive incident notifications. Once connected, configure channels per service."
      >
        {/* Guided Setup Wizard (Admin Only) */}
        {!isOAuthConfigured && isAdmin && <GuidedSlackSetup />}

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
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`settings-slack-pill ${integration.enabled ? 'active' : 'disabled'}`}
                  >
                    {integration.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <a href="/api/slack/oauth" className="status-page-button">
                    Reconnect
                  </a>
                </div>
              </div>

              {/* Available Channels */}
              <div className="settings-slack-channel-section mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Available Channels
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Channels the OpsSentinal bot has been added to
                    </p>
                  </div>
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
                </div>

                {loadingChannels ? (
                  <div className="settings-slack-loading">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span className="text-sm text-slate-500">Loading channels from Slack...</span>
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="settings-slack-empty-channels">
                    <p className="text-slate-600 font-medium">No channels found</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {searchQuery
                        ? `No channels match "${searchQuery}"`
                        : 'Make sure to add the OpsSentinal bot to the channels you want to use.'}
                    </p>
                  </div>
                ) : (
                  <div className="settings-slack-channel-grid">
                    {filteredChannels.slice(0, searchQuery ? 50 : 12).map(ch => (
                      <div key={ch.id} className="settings-slack-channel-card-item">
                        <span className="channel-hash">#</span>
                        <span className="channel-name" title={ch.name}>
                          {ch.name}
                        </span>
                      </div>
                    ))}
                    {!searchQuery && channels.length > 12 && (
                      <div className="settings-slack-channel-more">
                        +{channels.length - 12} more
                      </div>
                    )}
                  </div>
                )}
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
                  Connect to Slack
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
