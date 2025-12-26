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
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@opssure.com' }
            ]
        },
        {
            key: 'sendgrid',
            name: 'SendGrid (Email)',
            description: 'Send emails via SendGrid API',
            fields: [
                { name: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'SG.xxxxxxxxxxxx' },
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@opssure.com' }
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
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@opssure.com' },
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
        <div style={{ display: 'grid', gap: '1.5rem' }}>
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
                        whatsappAccountSid: config.whatsappAccountSid || '',
                        whatsappAuthToken: config.whatsappAuthToken || ''
                    });
                } else {
                    const twilioConfig = twilioProvider.config as any;

                    const updatedTwilioConfig = {
                        ...twilioConfig,
                        whatsappNumber: config.whatsappNumber || '',
                        whatsappEnabled: enabled,
                        whatsappAccountSid: config.whatsappAccountSid || '',
                        whatsappAuthToken: config.whatsappAuthToken || ''
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
        <div className="glass-panel" style={{
            padding: '1.5rem',
            border: '1px solid var(--border)',
            borderRadius: '0px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                            {providerConfig.name}
                        </h3>
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: enabled ? '#d1fae5' : '#fee2e2',
                            color: enabled ? '#065f46' : '#991b1b'
                        }}>
                            {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                        {providerConfig.description}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Quick Enable/Disable Toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: (hasRequiredConfig || enabled) ? 'pointer' : 'not-allowed', userSelect: 'none', opacity: (hasRequiredConfig || enabled) ? 1 : 0.6 }}>
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
                            style={{
                                width: '3rem',
                                height: '1.5rem',
                                appearance: 'none',
                                backgroundColor: enabled ? '#10b981' : '#d1d5db',
                                borderRadius: '0.75rem',
                                position: 'relative',
                                cursor: (hasRequiredConfig || enabled) ? 'pointer' : 'not-allowed',
                                transition: 'background-color 0.2s',
                                border: 'none',
                                outline: 'none'
                            }}
                        />
                        <style>{`
                            input[type="checkbox"]:after {
                                content: '';
                                position: absolute;
                                top: 2px;
                                left: 2px;
                                width: 1.25rem;
                                height: 1.25rem;
                                background: white;
                                border-radius: 50%;
                                transition: transform 0.2s;
                            }
                            input[type="checkbox"]:checked:after {
                                transform: translateX(1.5rem);
                            }
                        `}</style>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '3rem' }}>
                            {enabled ? 'On' : 'Off'}
                        </span>
                    </label>

                    <button
                        type="button"
                        onClick={onToggle}
                        className="glass-button"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        {isExpanded ? 'Collapse' : 'Configure'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                            />
                            Enable {providerConfig.name}
                        </label>
                    </div>

                    {enabled && (
                        <div style={{ display: 'grid', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0px', border: '1px solid var(--border)' }}>
                            {providerConfig.fields.map((field: any) => (
                                <div key={field.name}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                        {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                                    </label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            value={config[field.name] || ''}
                                            onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                                            placeholder={field.placeholder}
                                            required={field.required && enabled}
                                            rows={4}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid var(--border)',
                                                borderRadius: '0px',
                                                fontSize: '0.9rem',
                                                fontFamily: 'monospace',
                                                resize: 'vertical'
                                            }}
                                        />
                                    ) : field.type === 'checkbox' ? (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid var(--border)',
                                                borderRadius: '0px',
                                                fontSize: '0.9rem',
                                                fontFamily: field.type === 'password' ? 'monospace' : 'inherit'
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="glass-button primary"
                            style={{ padding: '0.75rem 1.5rem' }}
                        >
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        {saveStatus === 'success' && (
                            <span style={{ color: 'var(--success)', fontSize: '0.9rem' }}>✓ Saved successfully</span>
                        )}
                        {saveStatus === 'error' && error && (
                            <span style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>✗ {error}</span>
                        )}
                    </div>
                </form>
            )}

            {existing && !isExpanded && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Last updated: {formatDateTime(existing.updatedAt, userTimeZone, { format: 'datetime' })}
                </p>
            )}
        </div>
    );
}


