'use client';

import { useState } from 'react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import type { ProviderRecord, ProviderConfigSchema, SaveStatus } from '@/types/notification-types';

interface ProviderCardProps {
  providerConfig: ProviderConfigSchema;
  existing?: ProviderRecord;
  isExpanded: boolean;
  onToggle: () => void;
  twilioProvider?: ProviderRecord;
}

export default function ProviderCard({
  providerConfig,
  existing,
  isExpanded,
  onToggle,
  twilioProvider,
}: ProviderCardProps) {
  const { userTimeZone } = useTimezone();

  // For WhatsApp, enabled state is stored in the whatsappEnabled field of Twilio config
  const initialEnabled =
    providerConfig.key === 'whatsapp'
      ? !!(
          (existing?.config as Record<string, unknown>)?.whatsappEnabled &&
          (existing?.config as Record<string, unknown>)?.whatsappNumber
        )
      : existing?.enabled || false;

  // Check if provider has required configuration
  const hasRequiredConfig =
    existing?.config &&
    Object.keys(existing.config).length > 0 &&
    providerConfig.fields
      .filter(f => f.required)
      .every(f => {
        const value = (existing.config as Record<string, unknown>)[f.name];
        return value && String(value).trim() !== '';
      });

  const [enabled, setEnabled] = useState(initialEnabled);
  const [config, setConfig] = useState<Record<string, unknown>>(
    (existing?.config as Record<string, unknown>) || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');
    setError(null);

    try {
      // Validate required fields if enabled
      if (enabled) {
        const requiredFields = providerConfig.fields.filter(f => f.required);
        for (const field of requiredFields) {
          const value = config[field.name];
          if (!value || String(value).trim() === '') {
            throw new Error(`${field.label} is required`);
          }
        }
      }

      // Special handling for WhatsApp - it's stored in Twilio provider config
      if (providerConfig.key === 'whatsapp') {
        if (!twilioProvider) {
          const { updateNotificationProvider } =
            await import('@/app/(app)/settings/system/actions');
          await updateNotificationProvider(null, 'twilio', false, {
            whatsappNumber: (config.whatsappNumber as string) || '',
            whatsappEnabled: enabled,
            whatsappContentSid: (config.whatsappContentSid as string) || '',
            whatsappAccountSid: (config.whatsappAccountSid as string) || '',
            whatsappAuthToken: (config.whatsappAuthToken as string) || '',
          });
        } else {
          const twilioConfig = twilioProvider.config as Record<string, unknown>;
          const updatedTwilioConfig = {
            ...twilioConfig,
            whatsappNumber:
              (config.whatsappNumber as string) || (twilioConfig.whatsappNumber as string) || '',
            whatsappEnabled: enabled,
            whatsappContentSid:
              (config.whatsappContentSid as string) ||
              (twilioConfig.whatsappContentSid as string) ||
              '',
            whatsappAccountSid:
              (config.whatsappAccountSid as string) ||
              (twilioConfig.whatsappAccountSid as string) ||
              '',
            whatsappAuthToken:
              (config.whatsappAuthToken as string) ||
              (twilioConfig.whatsappAuthToken as string) ||
              '',
          };

          const { updateNotificationProvider } =
            await import('@/app/(app)/settings/system/actions');
          await updateNotificationProvider(
            twilioProvider.id,
            'twilio',
            twilioProvider.enabled,
            updatedTwilioConfig
          );
        }
      } else {
        const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
        await updateNotificationProvider(existing?.id || null, providerConfig.key, enabled, config);
      }

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabled = e.target.checked;

    // Check if provider is configured before enabling
    if (newEnabled && !hasRequiredConfig) {
      // eslint-disable-next-line no-alert
      alert(
        'Please configure this provider first before enabling it. Click "Configure" to add required settings.'
      );
      return;
    }

    setEnabled(newEnabled);

    try {
      if (providerConfig.key === 'whatsapp') {
        if (!twilioProvider) {
          const { updateNotificationProvider } =
            await import('@/app/(app)/settings/system/actions');
          await updateNotificationProvider(null, 'twilio', false, {
            whatsappNumber: (config.whatsappNumber as string) || '',
            whatsappEnabled: newEnabled,
          });
        } else {
          const twilioConfig = twilioProvider.config as Record<string, unknown>;
          const updatedTwilioConfig = {
            ...twilioConfig,
            whatsappNumber:
              (config.whatsappNumber as string) || (twilioConfig.whatsappNumber as string) || '',
            whatsappEnabled: newEnabled,
          };

          const { updateNotificationProvider } =
            await import('@/app/(app)/settings/system/actions');
          await updateNotificationProvider(
            twilioProvider.id,
            'twilio',
            twilioProvider.enabled,
            updatedTwilioConfig
          );
        }
      } else {
        const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
        await updateNotificationProvider(
          existing?.id || null,
          providerConfig.key,
          newEnabled,
          config
        );
      }

      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setEnabled(!newEnabled);
      // eslint-disable-next-line no-alert
      alert(
        `Failed to ${newEnabled ? 'enable' : 'disable'} provider: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  return (
    <div className="settings-provider-card">
      <div className="settings-provider-header">
        <div className="settings-provider-meta">
          <div className="settings-provider-title">
            <h3>{providerConfig.name}</h3>
            <span className={`settings-provider-status ${enabled ? 'enabled' : 'disabled'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="settings-provider-description">{providerConfig.description}</p>
        </div>
        <div className="settings-provider-actions">
          <label
            className={`settings-provider-toggle ${!hasRequiredConfig && !enabled ? 'is-disabled' : ''}`}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggleEnabled}
              disabled={isSaving || (!enabled && !hasRequiredConfig)}
              title={!hasRequiredConfig && !enabled ? 'Configure this provider first' : ''}
              className="settings-switch-input"
            />
            <span className="settings-provider-toggle-text">{enabled ? 'On' : 'Off'}</span>
          </label>

          <button type="button" onClick={onToggle} className="settings-link-button">
            {isExpanded ? 'Collapse' : 'Configure'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <form onSubmit={handleSave} className="settings-provider-form">
          <label className="settings-checkbox-row">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            Enable {providerConfig.name}
          </label>

          {enabled && (
            <div className="settings-provider-fields">
              {providerConfig.fields.map(field => (
                <div key={field.name}>
                  <label className="settings-field-label">
                    {field.label}{' '}
                    {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={(config[field.name] as string) || ''}
                      onChange={e => setConfig({ ...config, [field.name]: e.target.value })}
                      placeholder={field.placeholder}
                      required={field.required && enabled}
                      rows={4}
                      className="settings-textarea settings-input mono"
                    />
                  ) : field.type === 'checkbox' ? (
                    <label className="settings-checkbox-row">
                      <input
                        type="checkbox"
                        checked={(config[field.name] as boolean) || false}
                        onChange={e => setConfig({ ...config, [field.name]: e.target.checked })}
                      />
                      {field.label}
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      value={(config[field.name] as string) || ''}
                      onChange={e => setConfig({ ...config, [field.name]: e.target.value })}
                      placeholder={field.placeholder}
                      required={field.required && enabled}
                      className={`settings-input ${field.type === 'password' ? 'mono' : ''}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="settings-provider-footer">
            <button type="submit" disabled={isSaving} className="settings-primary-button">
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
            {saveStatus === 'success' && (
              <div className="settings-alert success">OK Saved successfully</div>
            )}
            {saveStatus === 'error' && error && (
              <div className="settings-alert error">Error: {error}</div>
            )}
          </div>
        </form>
      )}

      {existing && !isExpanded && (
        <p className="settings-provider-updated">
          Last updated: {formatDateTime(existing.updatedAt, userTimeZone, { format: 'datetime' })}
        </p>
      )}
    </div>
  );
}
