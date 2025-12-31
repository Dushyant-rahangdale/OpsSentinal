'use client';

import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import type { PushProvider, PushSettings } from '@/types/notification-types';

interface PushProviderSettingsProps {
  enabled: boolean;
  provider: PushProvider;
  firebaseProjectId: string;
  firebasePrivateKey: string;
  firebaseClientEmail: string;
  onesignalAppId: string;
  onesignalRestApiKey: string;
  onEnabledChange: (enabled: boolean) => void;
  onProviderChange: (provider: PushProvider) => void;
  onFirebaseProjectIdChange: (value: string) => void;
  onFirebasePrivateKeyChange: (value: string) => void;
  onFirebaseClientEmailChange: (value: string) => void;
  onOnesignalAppIdChange: (value: string) => void;
  onOnesignalRestApiKeyChange: (value: string) => void;
  onTestPush: () => Promise<void>;
  isPending: boolean;
}

export default function PushProviderSettings({
  enabled,
  provider,
  firebaseProjectId,
  firebasePrivateKey,
  firebaseClientEmail,
  onesignalAppId,
  onesignalRestApiKey,
  onEnabledChange,
  onProviderChange,
  onFirebaseProjectIdChange,
  onFirebasePrivateKeyChange,
  onFirebaseClientEmailChange,
  onOnesignalAppIdChange,
  onOnesignalRestApiKeyChange,
  onTestPush,
  isPending,
}: PushProviderSettingsProps) {
  return (
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
          checked={enabled}
          onChange={onEnabledChange}
        />

        {enabled && (
          <>
            <FormField
              type="select"
              label="Push Provider"
              value={provider}
              onChange={e => onProviderChange(e.target.value as PushProvider)}
              options={[
                { value: 'firebase', label: 'Firebase Cloud Messaging (FCM)' },
                { value: 'onesignal', label: 'OneSignal' },
              ]}
              fullWidth
            />

            {provider === 'firebase' && (
              <>
                <FormField
                  type="input"
                  label="Firebase Project ID"
                  inputType="text"
                  value={firebaseProjectId}
                  onChange={e => onFirebaseProjectIdChange(e.target.value)}
                  placeholder="your-project-id"
                  fullWidth
                />
                <FormField
                  type="input"
                  label="Firebase Client Email"
                  inputType="email"
                  value={firebaseClientEmail}
                  onChange={e => onFirebaseClientEmailChange(e.target.value)}
                  placeholder="firebase-adminsdk@your-project.iam.gserviceaccount.com"
                  fullWidth
                />
                <FormField
                  type="textarea"
                  label="Firebase Private Key"
                  value={firebasePrivateKey}
                  onChange={e => onFirebasePrivateKeyChange(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                  rows={6}
                  fullWidth
                />
              </>
            )}

            {provider === 'onesignal' && (
              <>
                <FormField
                  type="input"
                  label="OneSignal App ID"
                  inputType="text"
                  value={onesignalAppId}
                  onChange={e => onOnesignalAppIdChange(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  fullWidth
                />
                <FormField
                  type="input"
                  label="OneSignal REST API Key"
                  inputType="password"
                  value={onesignalRestApiKey}
                  onChange={e => onOnesignalRestApiKeyChange(e.target.value)}
                  placeholder="Your REST API key"
                  fullWidth
                />
              </>
            )}

            <div className="settings-inline-actions">
              <Button variant="secondary" onClick={onTestPush} disabled={isPending}>
                Test Push
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Helper to build Push settings object from component state
 */
export function buildPushSettings(
  enabled: boolean,
  provider: PushProvider,
  firebaseProjectId: string,
  firebasePrivateKey: string,
  firebaseClientEmail: string,
  onesignalAppId: string,
  onesignalRestApiKey: string
): PushSettings {
  return {
    enabled,
    provider,
    ...(provider === 'firebase' && {
      projectId: firebaseProjectId,
      privateKey: firebasePrivateKey,
      clientEmail: firebaseClientEmail,
    }),
    ...(provider === 'onesignal' && {
      appId: onesignalAppId,
      restApiKey: onesignalRestApiKey,
    }),
  };
}
