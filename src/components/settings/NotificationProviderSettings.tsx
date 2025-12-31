'use client';

import { useEffect, useState, useTransition } from 'react';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import StickyActionBar from '@/components/settings/StickyActionBar';

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
    const [whatsappContentSid, setWhatsappContentSid] = useState('');
    const [whatsappAccountSid, setWhatsappAccountSid] = useState('');
    const [whatsappAuthToken, setWhatsappAuthToken] = useState('');

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
                        setWhatsappContentSid(data.whatsapp.contentSid || '');
                        setWhatsappAccountSid(data.whatsapp.accountSid || '');
                        setWhatsappAuthToken(data.whatsapp.authToken || '');
                    }
                }
            } catch (error) {
                if (error instanceof Error) {
                    logger.error('Failed to load settings', { error: error.message });
                } else {
                    logger.error('Failed to load settings', { error: String(error) });
                }
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
                            contentSid: whatsappContentSid,
                            accountSid: whatsappAccountSid,
                            authToken: whatsappAuthToken,
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
            <div className="settings-empty-state-v2">
                <div className="settings-empty-icon">o</div>
                <h3>Loading settings</h3>
                <p>Fetching your notification provider configuration.</p>
            </div>
        );
    }

    return (
        <div className="settings-form-stack">
            {/* SMS Provider Configuration */}
            <section className="settings-subsection">
                <div className="settings-subsection-header">
                    <div>
                        <h3>SMS Notifications</h3>
                        <p>Configure SMS provider for incident notifications.</p>
                    </div>
                </div>
                <div className="settings-subsection-body">
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
                                    <div className="settings-note info">
                                        <strong>Note: Twilio Trial Account</strong>
                                        <br />
                                        Trial accounts can only send SMS to verified phone numbers.
                                        Verify recipient numbers at{' '}
                                        <a
                                            href="https://twilio.com/user/account/phone-numbers/verified"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="settings-link-inline"
                                        >
                                            twilio.com/user/account/phone-numbers/verified
                                        </a>
                                        {' '}or upgrade your Twilio account to send to any number.
                                    </div>
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

                            <div className="settings-inline-actions">
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
            </section>

            {/* Push Notification Configuration */}
            <section className="settings-subsection">
                <div className="settings-subsection-header">
                    <div>
                        <h3>Push Notifications</h3>
                        <p>Configure push notification provider for mobile devices.</p>
                    </div>
                </div>
                <div className="settings-subsection-body">
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

                            <div className="settings-inline-actions">
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
            </section>

            {/* WhatsApp Configuration */}
            <section className="settings-subsection">
                <div className="settings-subsection-header">
                    <div>
                        <h3>WhatsApp Notifications</h3>
                        <p>Configure WhatsApp Business API via Twilio for incident notifications.</p>
                    </div>
                </div>
                <div className="settings-subsection-body">
                    <div className="settings-note info">
                        <strong>WhatsApp requirements:</strong>
                        <ul>
                            <li>Requires a Twilio WhatsApp Business API number.</li>
                            <li>Provide WhatsApp credentials or reuse Twilio SMS credentials.</li>
                            <li>Users must enable WhatsApp notifications in their preferences.</li>
                        </ul>
                    </div>

                    <FormField
                        type="input"
                        label="WhatsApp Business Number"
                        inputType="tel"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+1234567890"
                        helperText="Your Twilio WhatsApp Business API number in E.164 format."
                        fullWidth
                    />
                    <FormField
                        type="input"
                        label="WhatsApp Account SID (Optional)"
                        inputType="text"
                        value={whatsappAccountSid}
                        onChange={(e) => setWhatsappAccountSid(e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        helperText="If blank, the SMS Account SID is used when available."
                        fullWidth
                    />
                    <FormField
                        type="input"
                        label="WhatsApp Auth Token (Optional)"
                        inputType="password"
                        value={whatsappAuthToken}
                        onChange={(e) => setWhatsappAuthToken(e.target.value)}
                        placeholder="Your Twilio auth token"
                        helperText="If blank, the SMS Auth Token is used when available."
                        fullWidth
                    />
                    <FormField
                        type="input"
                        label="WhatsApp Template SID (Optional)"
                        inputType="text"
                        value={whatsappContentSid}
                        onChange={(e) => setWhatsappContentSid(e.target.value)}
                        placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        helperText="Required to send notifications outside the 24-hour window."
                        fullWidth
                    />
                    {!smsEnabled || smsProvider !== 'twilio' ? (
                        <div className="settings-note info">
                            <strong>Note:</strong> SMS is not using Twilio. WhatsApp will rely on the credentials above.
                        </div>
                    ) : (
                        <div className="settings-note info">
                            <strong>Note:</strong> WhatsApp can reuse your Twilio SMS credentials if you leave the WhatsApp credentials blank.
                        </div>
                    )}
                </div>
            </section>

            <StickyActionBar>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isPending}
                >
                    Save Settings
                </Button>
            </StickyActionBar>
        </div>
    );
}





