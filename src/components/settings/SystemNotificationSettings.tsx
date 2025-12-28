'use client';

import { useActionState, useState } from 'react';
import { updateNotificationProvider } from '@/app/(app)/settings/system/actions';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

type Provider = {
    id: string;
    provider: string;
    enabled: boolean;
    config: any;
    updatedAt: Date;
};

type Props = {
    providers: Provider[];
};

export default function SystemNotificationSettings({ providers }: Props) {
    const { userTimeZone } = useTimezone();
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    const providerMap = new Map(providers.map(p => [p.provider, p]));

    // For WhatsApp, we need to read from Twilio provider config
    const twilioProvider = providerMap.get('twilio');
    const whatsappConfig = twilioProvider?.config as any;
    const whatsappEnabled = !!(whatsappConfig?.whatsappEnabled && whatsappConfig?.whatsappNumber);

    // Create a virtual WhatsApp provider entry
    const whatsappProvider: Provider | undefined = whatsappConfig?.whatsappNumber ? {
        id: twilioProvider?.id || '',
        provider: 'whatsapp',
        enabled: whatsappEnabled,
        config: {
            whatsappNumber: whatsappConfig.whatsappNumber,
            whatsappEnabled: whatsappConfig.whatsappEnabled,
            whatsappContentSid: whatsappConfig.whatsappContentSid,
            whatsappAccountSid: whatsappConfig.whatsappAccountSid,
            whatsappAuthToken: whatsappConfig.whatsappAuthToken
        },
        updatedAt: twilioProvider?.updatedAt || new Date()
    } : undefined;


    const providerConfigs = [
        {
            key: 'twilio',
            name: 'Twilio (SMS)',
            description: 'Send SMS notifications via Twilio',
            fields: [
                { name: 'accountSid', label: 'Account SID', type: 'text', required: true, placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
                { name: 'authToken', label: 'Auth Token', type: 'password', required: true, placeholder: 'Your Twilio auth token' },
                { name: 'fromNumber', label: 'From Phone Number', type: 'tel', required: true, placeholder: '+1234567890' }
            ]
        },
        {
            key: 'whatsapp',
            name: 'WhatsApp (via Twilio)',
            description: 'Send WhatsApp notifications via Twilio WhatsApp Business API',
            fields: [
                { name: 'whatsappNumber', label: 'WhatsApp Business Number', type: 'tel', required: true, placeholder: 'whatsapp:+14155238886' },
                { name: 'whatsappContentSid', label: 'WhatsApp Template SID (Optional)', type: 'text', required: false, placeholder: 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
                { name: 'whatsappAccountSid', label: 'Account SID (Optional - overrides Twilio SMS config)', type: 'text', required: false, placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
                { name: 'whatsappAuthToken', label: 'Auth Token (Optional - overrides Twilio SMS config)', type: 'password', required: false, placeholder: 'Your Twilio auth token' }
            ],
            requiresProvider: 'twilio' // Special: WhatsApp config is stored in Twilio provider config
        },
        {
            key: 'resend',
            name: 'Resend (Email)',
            description: 'Send emails via Resend API',
            fields: [
                { name: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 're_xxxxxxxxxxxx' },
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@OpsSentinal.com' }
            ]
        },
        {
            key: 'sendgrid',
            name: 'SendGrid (Email)',
            description: 'Send emails via SendGrid API',
            fields: [
                { name: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'SG.xxxxxxxxxxxx' },
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@OpsSentinal.com' }
            ]
        },
        {
            key: 'smtp',
            name: 'SMTP (Email)',
            description: 'Send emails via generic SMTP server',
            fields: [
                { name: 'host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.example.com' },
                { name: 'port', label: 'Port', type: 'number', required: true, placeholder: '587' },
                { name: 'user', label: 'Username', type: 'text', required: true, placeholder: 'user@example.com' },
                { name: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Your SMTP password' },
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@OpsSentinal.com' },
                { name: 'secure', label: 'Use TLS/SSL', type: 'checkbox', required: false }
            ]
        },
        {
            key: 'firebase',
            name: 'Firebase (Push)',
            description: 'Send push notifications via Firebase Cloud Messaging',
            fields: [
                { name: 'projectId', label: 'Project ID', type: 'text', required: true, placeholder: 'your-project-id' },
                { name: 'privateKey', label: 'Private Key', type: 'textarea', required: true, placeholder: '-----BEGIN PRIVATE KEY-----\n...' },
                { name: 'clientEmail', label: 'Client Email', type: 'email', required: true, placeholder: 'firebase-adminsdk@...' }
            ]
        },
        {
            key: 'onesignal',
            name: 'OneSignal (Push)',
            description: 'Send push notifications via OneSignal',
            fields: [
                { name: 'appId', label: 'App ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                { name: 'apiKey', label: 'REST API Key', type: 'password', required: true, placeholder: 'Your OneSignal API key' }
            ]
        }
    ];

    return (
        <div className="settings-form-stack">
            {providerConfigs.map(providerConfig => {
                // For WhatsApp, use the virtual provider we created
                const existing = providerConfig.key === 'whatsapp'
                    ? whatsappProvider
                    : providerMap.get(providerConfig.key);
                const isExpanded = expandedProvider === providerConfig.key;

                return (
                    <ProviderCard
                        key={providerConfig.key}
                        providerConfig={providerConfig}
                        existing={existing}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedProvider(isExpanded ? null : providerConfig.key)}
                        twilioProvider={providerConfig.key === 'whatsapp' ? twilioProvider : undefined}
                    />
                );
            })}
        </div>
    );
}

function ProviderCard({
    providerConfig,
    existing,
    isExpanded,
    onToggle,
    twilioProvider
}: {
    providerConfig: any;
    existing?: Provider;
    isExpanded: boolean;
    onToggle: () => void;
    twilioProvider?: Provider;
}) {
    // Get user timezone for date formatting
    const { userTimeZone } = useTimezone();

    // For WhatsApp, enabled state is stored in the whatsappEnabled field of Twilio config
    const initialEnabled = providerConfig.key === 'whatsapp'
        ? !!(existing?.config?.whatsappEnabled && existing?.config?.whatsappNumber)
        : (existing?.enabled || false);

    // Check if provider has required configuration  
    const hasRequiredConfig = existing?.config && Object.keys(existing.config).length > 0 &&
        providerConfig.fields
            .filter((f: any) => f.required)
            .every((f: any) => existing.config[f.name] && existing.config[f.name].toString().trim() !== '');

    const [enabled, setEnabled] = useState(initialEnabled);
    const [config, setConfig] = useState<Record<string, any>>(existing?.config || {});
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveStatus('idle');
        setError(null);

        try {
            // Validate required fields if enabled
            if (enabled) {
                const requiredFields = providerConfig.fields.filter((f: any) => f.required);
                for (const field of requiredFields) {
                    if (!config[field.name] || config[field.name].trim() === '') {
                        throw new Error(`${field.label} is required`);
                    }
                }
            }

            // Special handling for WhatsApp - it's stored in Twilio provider config
            if (providerConfig.key === 'whatsapp') {
                // Update Twilio provider config with WhatsApp number and enabled state
                // Create Twilio provider if it doesn't exist
                if (!twilioProvider) {
                    const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
                    await updateNotificationProvider(null, 'twilio', false, {
                        whatsappNumber: config.whatsappNumber || '',
                        whatsappEnabled: enabled,
                        whatsappContentSid: config.whatsappContentSid || '',
                        whatsappAccountSid: config.whatsappAccountSid || '',
                        whatsappAuthToken: config.whatsappAuthToken || ''
                    });
                } else {
                    const twilioConfig = twilioProvider.config as any;

                    const updatedTwilioConfig = {
                        ...twilioConfig,
                        whatsappNumber: config.whatsappNumber || twilioConfig.whatsappNumber || '',
                        whatsappEnabled: enabled,
                        whatsappContentSid: config.whatsappContentSid || twilioConfig.whatsappContentSid || '',
                        whatsappAccountSid: config.whatsappAccountSid || twilioConfig.whatsappAccountSid || '',
                        whatsappAuthToken: config.whatsappAuthToken || twilioConfig.whatsappAuthToken || ''
                    };

                    const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
                    await updateNotificationProvider(twilioProvider.id, 'twilio', twilioProvider.enabled, updatedTwilioConfig);
                }
            } else {
                const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
                await updateNotificationProvider(existing?.id || null, providerConfig.key, enabled, config);
            }

            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus('idle');
                window.location.reload(); // Refresh to show updated data
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to save configuration');
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
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
                    <p className="settings-provider-description">
                        {providerConfig.description}
                    </p>
                </div>
                <div className="settings-provider-actions">
                    {/* Quick Enable/Disable Toggle */}
                    <label className={`settings-provider-toggle ${(!hasRequiredConfig && !enabled) ? 'is-disabled' : ''}`}>
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={async (e) => {
                                const newEnabled = e.target.checked;

                                // Check if provider is configured before enabling
                                if (newEnabled && !hasRequiredConfig) {
                                    alert('Please configure this provider first before enabling it. Click "Configure" to add required settings.');
                                    return;
                                }

                                // Update local state
                                setEnabled(newEnabled);

                                // Save immediately
                                try {
                                    if (providerConfig.key === 'whatsapp') {
                                        // Create Twilio provider if it doesn't exist
                                        if (!twilioProvider) {
                                            const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
                                            await updateNotificationProvider(null, 'twilio', false, {
                                                whatsappNumber: config.whatsappNumber || '',
                                                whatsappEnabled: newEnabled
                                            });
                                        } else {
                                            const twilioConfig = twilioProvider.config as any;
                                            const updatedTwilioConfig = {
                                                ...twilioConfig,
                                                whatsappNumber: config.whatsappNumber || twilioConfig.whatsappNumber || '',
                                                whatsappEnabled: newEnabled
                                            };

                                            const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
                                            await updateNotificationProvider(twilioProvider.id, 'twilio', twilioProvider.enabled, updatedTwilioConfig);
                                        }
                                    } else {
                                        const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
                                        await updateNotificationProvider(existing?.id || null, providerConfig.key, newEnabled, config);
                                    }

                                    // Refresh to show updated data
                                    setTimeout(() => window.location.reload(), 500);
                                } catch (err: any) {
                                    // Revert on error
                                    setEnabled(!newEnabled);
                                    alert(`Failed to ${newEnabled ? 'enable' : 'disable'} provider: ${err.message}`);
                                }
                            }}
                            disabled={isSaving || (!enabled && !hasRequiredConfig)}
                            title={!hasRequiredConfig && !enabled ? 'Configure this provider first' : ''}
                            className="settings-switch-input"
                        />
                        <span className="settings-provider-toggle-text">
                            {enabled ? 'On' : 'Off'}
                        </span>
                    </label>

                    <button
                        type="button"
                        onClick={onToggle}
                        className="settings-link-button"
                    >
                        {isExpanded ? 'Collapse' : 'Configure'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <form onSubmit={handleSave} className="settings-provider-form">
                    <label className="settings-checkbox-row">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />
                        Enable {providerConfig.name}
                    </label>

                    {enabled && (
                        <div className="settings-provider-fields">
                            {providerConfig.fields.map((field: any) => (
                                <div key={field.name}>
                                    <label className="settings-field-label">
                                        {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                                    </label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            value={config[field.name] || ''}
                                            onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                                            placeholder={field.placeholder}
                                            required={field.required && enabled}
                                            rows={4}
                                            className="settings-textarea settings-input mono"
                                        />
                                    ) : field.type === 'checkbox' ? (
                                        <label className="settings-checkbox-row">
                                            <input
                                                type="checkbox"
                                                checked={config[field.name] || false}
                                                onChange={(e) => setConfig({ ...config, [field.name]: e.target.checked })}
                                            />
                                            {field.label}
                                        </label>
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={config[field.name] || ''}
                                            onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
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
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="settings-primary-button"
                        >
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







