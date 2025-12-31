'use client';

import { useEffect, useState, useTransition } from 'react';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import Button from '@/components/ui/Button';
import StickyActionBar from '@/components/settings/StickyActionBar';
import SmsProviderSettings, { buildSmsSettings } from '@/components/settings/SmsProviderSettings';
import PushProviderSettings, {
  buildPushSettings,
} from '@/components/settings/PushProviderSettings';
import WhatsappProviderSettings, {
  buildWhatsappSettings,
} from '@/components/settings/WhatsappProviderSettings';
import type { SmsProvider, PushProvider, NotificationSettings } from '@/types/notification-types';

export default function NotificationProviderSettings() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // SMS State
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsProvider, setSmsProvider] = useState<SmsProvider>('twilio');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioFromNumber, setTwilioFromNumber] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');

  // Push State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushProvider, setPushProvider] = useState<PushProvider>('firebase');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [firebasePrivateKey, setFirebasePrivateKey] = useState('');
  const [firebaseClientEmail, setFirebaseClientEmail] = useState('');
  const [onesignalAppId, setOnesignalAppId] = useState('');
  const [onesignalRestApiKey, setOnesignalRestApiKey] = useState('');

  // WhatsApp State
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
          const data: NotificationSettings = await response.json();
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
        const smsSettings = buildSmsSettings(
          smsEnabled,
          smsProvider,
          twilioAccountSid,
          twilioAuthToken,
          twilioFromNumber,
          awsRegion,
          awsAccessKeyId,
          awsSecretAccessKey
        );

        const pushSettings = buildPushSettings(
          pushEnabled,
          pushProvider,
          firebaseProjectId,
          firebasePrivateKey,
          firebaseClientEmail,
          onesignalAppId,
          onesignalRestApiKey
        );

        const whatsappSettings = buildWhatsappSettings(
          whatsappNumber,
          whatsappContentSid,
          whatsappAccountSid,
          whatsappAuthToken
        );

        const response = await fetch('/api/settings/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sms: smsSettings,
            push: pushSettings,
            whatsapp: whatsappSettings,
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
      <SmsProviderSettings
        enabled={smsEnabled}
        provider={smsProvider}
        twilioAccountSid={twilioAccountSid}
        twilioAuthToken={twilioAuthToken}
        twilioFromNumber={twilioFromNumber}
        awsRegion={awsRegion}
        awsAccessKeyId={awsAccessKeyId}
        awsSecretAccessKey={awsSecretAccessKey}
        onEnabledChange={setSmsEnabled}
        onProviderChange={setSmsProvider}
        onTwilioAccountSidChange={setTwilioAccountSid}
        onTwilioAuthTokenChange={setTwilioAuthToken}
        onTwilioFromNumberChange={setTwilioFromNumber}
        onAwsRegionChange={setAwsRegion}
        onAwsAccessKeyIdChange={setAwsAccessKeyId}
        onAwsSecretAccessKeyChange={setAwsSecretAccessKey}
        onTestSms={handleTestSMS}
        isPending={isPending}
      />

      <PushProviderSettings
        enabled={pushEnabled}
        provider={pushProvider}
        firebaseProjectId={firebaseProjectId}
        firebasePrivateKey={firebasePrivateKey}
        firebaseClientEmail={firebaseClientEmail}
        onesignalAppId={onesignalAppId}
        onesignalRestApiKey={onesignalRestApiKey}
        onEnabledChange={setPushEnabled}
        onProviderChange={setPushProvider}
        onFirebaseProjectIdChange={setFirebaseProjectId}
        onFirebasePrivateKeyChange={setFirebasePrivateKey}
        onFirebaseClientEmailChange={setFirebaseClientEmail}
        onOnesignalAppIdChange={setOnesignalAppId}
        onOnesignalRestApiKeyChange={setOnesignalRestApiKey}
        onTestPush={handleTestPush}
        isPending={isPending}
      />

      <WhatsappProviderSettings
        whatsappNumber={whatsappNumber}
        whatsappContentSid={whatsappContentSid}
        whatsappAccountSid={whatsappAccountSid}
        whatsappAuthToken={whatsappAuthToken}
        onWhatsappNumberChange={setWhatsappNumber}
        onWhatsappContentSidChange={setWhatsappContentSid}
        onWhatsappAccountSidChange={setWhatsappAccountSid}
        onWhatsappAuthTokenChange={setWhatsappAuthToken}
        smsEnabled={smsEnabled}
        smsProvider={smsProvider}
      />

      <StickyActionBar>
        <Button variant="primary" onClick={handleSave} isLoading={isPending}>
          Save Settings
        </Button>
      </StickyActionBar>
    </div>
  );
}
