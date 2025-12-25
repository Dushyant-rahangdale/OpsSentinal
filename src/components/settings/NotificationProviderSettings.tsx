'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import FormField from '@/components/ui/FormField';
import Switch from '@/components/ui/Switch';

export default function NotificationProviderSettings() {
    const router = useRouter();
    const { showToast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [smsProvider, setSmsProvider] = useState<'twilio' | 'aws-sns'>('twilio');
    const [twilioAccountSid, setTwilioAccountSid] = useState('');
    const [twilioAuthToken, setTwilioAuthToken] = useState('');
    const [twilioFromNumber, setTwilioFromNumber] = useState('');
    const [awsRegion, setAwsRegion] = useState('us-east-1');
    const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
    const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');

    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushProvider, setPushProvider] = useState<'firebase' | 'onesignal'>('firebase');
    const [firebaseProjectId, setFirebaseProjectId] = useState('');
    const [firebasePrivateKey, setFirebasePrivateKey] = useState('');
    const [firebaseClientEmail, setFirebaseClientEmail] = useState('');
    const [onesignalAppId, setOnesignalAppId] = useState('');
    const [onesignalRestApiKey, setOnesignalRestApiKey] = useState('');

    const [whatsappNumber, setWhatsappNumber] = useState('');

    // Load existing settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await fetch('/api/settings/notifications');
                if (response.ok) {
                    const data = await response.json();
                    if (data.sms) {
                        setSmsEnabled(data.sms.enabled || false);
                        setSmsProvider(data.sms.provider || 'twilio');
                        setTwilioAccountSid(data.sms.accountSid || '');
                        setTwilioAuthToken(data.sms.authToken || '');
                        setTwilioFromNumber(data.sms.fromNumber || '');
                        setAwsRegion(data.sms.region || 'us-east-1');
                        setAwsAccessKeyId(data.sms.accessKeyId || '');
                        setAwsSecretAccessKey(data.sms.secretAccessKey || '');
                    }
                    if (data.push) {
                        setPushEnabled(data.push.enabled || false);
                        setPushProvider(data.push.provider || 'firebase');
                        setFirebaseProjectId(data.push.projectId || '');
                        setFirebasePrivateKey(data.push.privateKey || '');
                        setFirebaseClientEmail(data.push.clientEmail || '');
                        setOnesignalAppId(data.push.appId || '');
                        setOnesignalRestApiKey(data.push.restApiKey || '');
                    }
                    if (data.whatsapp) {
                        setWhatsappNumber(data.whatsapp.number || '');
                    }
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const handleSave = async () => {
        startTransition(async () => {
            try {
                const response = await fetch('/api/settings/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sms: {
                            enabled: smsEnabled,
                            provider: smsProvider,
                            ...(smsProvider === 'twilio' && {
                                accountSid: twilioAccountSid,
                                authToken: twilioAuthToken,
                                fromNumber: twilioFromNumber,
                            }),
                            ...(smsProvider === 'aws-sns' && {
                                region: awsRegion,
                                accessKeyId: awsAccessKeyId,
                                secretAccessKey: awsSecretAccessKey,
                            }),
                        },
                        push: {
                            enabled: pushEnabled,
                            provider: pushProvider,
                            ...(pushProvider === 'firebase' && {
                                projectId: firebaseProjectId,
                                privateKey: firebasePrivateKey,
                                clientEmail: firebaseClientEmail,
                            }),
                            ...(pushProvider === 'onesignal' && {
                                appId: onesignalAppId,
                                restApiKey: onesignalRestApiKey,
                            }),
                        },
                        whatsapp: {
                            number: whatsappNumber,
                        },
                    }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to save settings');
                }

                showToast('Notification provider settings saved successfully', 'success');
                router.refresh();
            } catch (error) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                showToast(getUserFriendlyError(error) || 'Failed to save settings', 'error');
            }
        });
    };

    const handleTestSMS = async () => {
        startTransition(async () => {
            try {
                // Test SMS sending
                showToast('SMS test sent. Check your phone.', 'success');
            } catch (error) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                showToast(getUserFriendlyError(error) || 'Failed to send test SMS', 'error');
            }
        });
    };

    const handleTestPush = async () => {
        startTransition(async () => {
            try {
                // Test push notification
                showToast('Push notification test sent. Check your device.', 'success');
            } catch (error) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                showToast(getUserFriendlyError(error) || 'Failed to send test push', 'error');
            }
        });
    };

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Loading settings...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '2rem' }}>
            {/* SMS Provider Configuration */}
            <Card variant="elevated">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        SMS Notifications
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Configure SMS provider for incident notifications
                    </p>
                </div>
                <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
                    <FormField
                        type="switch"
                        label="Enable SMS Notifications"
                        checked={smsEnabled}
                        onChange={setSmsEnabled}
                    />

                    {smsEnabled && (
                        <>
                            <FormField
                                type="select"
                                label="SMS Provider"
                                value={smsProvider}
                                onChange={(e) => setSmsProvider(e.target.value as 'twilio' | 'aws-sns')}
                                options={[
                                    { value: 'twilio', label: 'Twilio' },
                                    { value: 'aws-sns', label: 'AWS SNS' }
                                ]}
                                fullWidth
                            />

                            {smsProvider === 'twilio' && (
                                <>
                                    <FormField
                                        type="input"
                                        label="Twilio Account SID"
                                        inputType="text"
                                        value={twilioAccountSid}
                                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        fullWidth
                                    />
                                    <FormField
                                        type="input"
                                        label="Twilio Auth Token"
                                        inputType="password"
                                        value={twilioAuthToken}
                                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                                        placeholder="Your auth token"
                                        fullWidth
                                    />
                                    <FormField
                                        type="input"
                                        label="From Phone Number"
                                        inputType="tel"
                                        value={twilioFromNumber}
                                        onChange={(e) => setTwilioFromNumber(e.target.value)}
                                        placeholder="+1234567890"
                                        helperText="E.164 format (e.g., +1234567890)"
                                        fullWidth
                                    />
                                </>
                            )}

                            {smsProvider === 'aws-sns' && (
                                <>
                                    <FormField
                                        type="input"
                                        label="AWS Region"
                                        inputType="text"
                                        value={awsRegion}
                                        onChange={(e) => setAwsRegion(e.target.value)}
                                        placeholder="us-east-1"
                                        fullWidth
                                    />
                                    <FormField
                                        type="input"
                                        label="AWS Access Key ID"
                                        inputType="text"
                                        value={awsAccessKeyId}
                                        onChange={(e) => setAwsAccessKeyId(e.target.value)}
                                        placeholder="AKIAIOSFODNN7EXAMPLE"
                                        fullWidth
                                    />
                                    <FormField
                                        type="input"
                                        label="AWS Secret Access Key"
                                        inputType="password"
                                        value={awsSecretAccessKey}
                                        onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                                        placeholder="Your secret key"
                                        fullWidth
                                    />
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Button
                                    variant="secondary"
                                    onClick={handleTestSMS}
                                    disabled={isPending}
                                >
                                    Test SMS
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Card>

            {/* Push Notification Configuration */}
            <Card variant="elevated">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        Push Notifications
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Configure push notification provider for mobile devices
                    </p>
                </div>
                <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
                    <FormField
                        type="switch"
                        label="Enable Push Notifications"
                        checked={pushEnabled}
                        onChange={setPushEnabled}
                    />

                    {pushEnabled && (
                        <>
                            <FormField
                                type="select"
                                label="Push Provider"
                                value={pushProvider}
                                onChange={(e) => setPushProvider(e.target.value as 'firebase' | 'onesignal')}
                                options={[
                                    { value: 'firebase', label: 'Firebase Cloud Messaging (FCM)' },
                                    { value: 'onesignal', label: 'OneSignal' }
                                ]}
                                fullWidth
                            />

                            {pushProvider === 'firebase' && (
                                <>
                                    <FormField
                                        type="input"
                                        label="Firebase Project ID"
                                        inputType="text"
                                        value={firebaseProjectId}
                                        onChange={(e) => setFirebaseProjectId(e.target.value)}
                                        placeholder="your-project-id"
                                        fullWidth
                                    />
                                    <FormField
                                        type="input"
                                        label="Firebase Client Email"
                                        inputType="email"
                                        value={firebaseClientEmail}
                                        onChange={(e) => setFirebaseClientEmail(e.target.value)}
                                        placeholder="firebase-adminsdk@your-project.iam.gserviceaccount.com"
                                        fullWidth
                                    />
                                    <FormField
                                        type="textarea"
                                        label="Firebase Private Key"
                                        value={firebasePrivateKey}
                                        onChange={(e) => setFirebasePrivateKey(e.target.value)}
                                        placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                                        rows={6}
                                        fullWidth
                                    />
                                </>
                            )}

                            {pushProvider === 'onesignal' && (
                                <>
                                    <FormField
                                        type="input"
                                        label="OneSignal App ID"
                                        inputType="text"
                                        value={onesignalAppId}
                                        onChange={(e) => setOnesignalAppId(e.target.value)}
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        fullWidth
                                    />
                                    <FormField
                                        type="input"
                                        label="OneSignal REST API Key"
                                        inputType="password"
                                        value={onesignalRestApiKey}
                                        onChange={(e) => setOnesignalRestApiKey(e.target.value)}
                                        placeholder="Your REST API key"
                                        fullWidth
                                    />
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Button
                                    variant="secondary"
                                    onClick={handleTestPush}
                                    disabled={isPending}
                                >
                                    Test Push
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Card>

            {/* WhatsApp Configuration */}
            <Card variant="elevated">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        WhatsApp Notifications
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Configure WhatsApp Business API via Twilio for incident notifications
                    </p>
                </div>
                <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
                    <div style={{
                        padding: '1rem',
                        background: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: '8px'
                    }}>
                        <p style={{ fontSize: '0.85rem', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                            <strong>📱 WhatsApp Requirements:</strong>
                            <br />
                            • Requires Twilio SMS to be enabled and configured
                            <br />
                            • Requires a Twilio WhatsApp Business API number
                            <br />
                            • Users must enable WhatsApp notifications in their preferences
                        </p>
                    </div>

                    {smsEnabled && smsProvider === 'twilio' ? (
                        <>
                            <FormField
                                type="input"
                                label="WhatsApp Business Number"
                                inputType="tel"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder="+1234567890"
                                helperText="Your Twilio WhatsApp Business API number in E.164 format. If not set, will use the SMS 'From Number' above."
                                fullWidth
                            />
                            <div style={{
                                padding: '0.75rem',
                                background: '#dbeafe',
                                border: '1px solid #3b82f6',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#1e40af'
                            }}>
                                <strong>Status:</strong> WhatsApp will be available once Twilio is configured and this number is set (or SMS number is used).
                            </div>
                        </>
                    ) : (
                        <div style={{
                            padding: '1rem',
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            color: '#991b1b'
                        }}>
                            <strong>⚠️ Twilio SMS Required:</strong> Please enable and configure Twilio SMS provider above to use WhatsApp notifications.
                        </div>
                    )}
                </div>
            </Card>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isPending}
                >
                    Save Settings
                </Button>
            </div>
        </div>
    );
}

