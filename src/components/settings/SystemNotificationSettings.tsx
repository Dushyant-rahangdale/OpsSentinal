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
            key: 'resend',
            name: 'Resend (Email)',
            description: 'Send emails via Resend API',
            fields: [
                { name: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 're_xxxxxxxxxxxx' },
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@opsguard.com' }
            ]
        },
        {
            key: 'sendgrid',
            name: 'SendGrid (Email)',
            description: 'Send emails via SendGrid API',
            fields: [
                { name: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'SG.xxxxxxxxxxxx' },
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@opsguard.com' }
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
                { name: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'noreply@opsguard.com' },
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
                const existing = providerMap.get(providerConfig.key);
                const isExpanded = expandedProvider === providerConfig.key;

                return (
                    <ProviderCard
                        key={providerConfig.key}
                        providerConfig={providerConfig}
                        existing={existing}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedProvider(isExpanded ? null : providerConfig.key)}
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
    onToggle
}: {
    providerConfig: any;
    existing?: Provider;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    // Get user timezone for date formatting
    const { userTimeZone } = useTimezone();
    const [enabled, setEnabled] = useState(existing?.enabled || false);
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

            const { updateNotificationProvider } = await import('@/app/(app)/settings/system/actions');
            await updateNotificationProvider(existing?.id || null, providerConfig.key, enabled, config);
            
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
                <button
                    type="button"
                    onClick={onToggle}
                    className="glass-button"
                    style={{ padding: '0.5rem 1rem' }}
                >
                    {isExpanded ? 'Collapse' : 'Configure'}
                </button>
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

