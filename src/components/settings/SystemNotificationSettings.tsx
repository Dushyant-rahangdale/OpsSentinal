'use client';

import { useState } from 'react';
import ProviderCard from '@/components/settings/ProviderCard';
import type { ProviderRecord, ProviderConfigSchema } from '@/types/notification-types';

interface SystemNotificationSettingsProps {
  providers: ProviderRecord[];
}

// Provider configuration schemas
const providerConfigs: ProviderConfigSchema[] = [
  {
    key: 'twilio',
    name: 'Twilio (SMS)',
    description: 'Send SMS notifications via Twilio',
    fields: [
      {
        name: 'accountSid',
        label: 'Account SID',
        type: 'text',
        required: true,
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      {
        name: 'authToken',
        label: 'Auth Token',
        type: 'password',
        required: true,
        placeholder: 'Your Twilio auth token',
      },
      {
        name: 'fromNumber',
        label: 'From Phone Number',
        type: 'tel',
        required: true,
        placeholder: '+1234567890',
      },
    ],
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp (via Twilio)',
    description: 'Send WhatsApp notifications via Twilio WhatsApp Business API',
    fields: [
      {
        name: 'whatsappNumber',
        label: 'WhatsApp Business Number',
        type: 'tel',
        required: true,
        placeholder: 'whatsapp:+14155238886',
      },
      {
        name: 'whatsappContentSid',
        label: 'WhatsApp Template SID (Optional)',
        type: 'text',
        required: false,
        placeholder: 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      {
        name: 'whatsappAccountSid',
        label: 'Account SID (Optional - overrides Twilio SMS config)',
        type: 'text',
        required: false,
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      {
        name: 'whatsappAuthToken',
        label: 'Auth Token (Optional - overrides Twilio SMS config)',
        type: 'password',
        required: false,
        placeholder: 'Your Twilio auth token',
      },
    ],
    requiresProvider: 'twilio',
  },
  {
    key: 'resend',
    name: 'Resend (Email)',
    description: 'Send emails via Resend API',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 're_xxxxxxxxxxxx',
      },
      {
        name: 'fromEmail',
        label: 'From Email',
        type: 'email',
        required: true,
        placeholder: 'noreply@OpsSentinal.com',
      },
    ],
  },
  {
    key: 'sendgrid',
    name: 'SendGrid (Email)',
    description: 'Send emails via SendGrid API',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'SG.xxxxxxxxxxxx',
      },
      {
        name: 'fromEmail',
        label: 'From Email',
        type: 'email',
        required: true,
        placeholder: 'noreply@OpsSentinal.com',
      },
    ],
  },
  {
    key: 'smtp',
    name: 'SMTP (Email)',
    description: 'Send emails via generic SMTP server',
    fields: [
      {
        name: 'host',
        label: 'SMTP Host',
        type: 'text',
        required: true,
        placeholder: 'smtp.example.com',
      },
      {
        name: 'port',
        label: 'Port',
        type: 'number',
        required: true,
        placeholder: '587',
      },
      {
        name: 'user',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'user@example.com',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'Your SMTP password',
      },
      {
        name: 'fromEmail',
        label: 'From Email',
        type: 'email',
        required: true,
        placeholder: 'noreply@OpsSentinal.com',
      },
      { name: 'secure', label: 'Use TLS/SSL', type: 'checkbox', required: false },
    ],
  },
  {
    key: 'ses',
    name: 'Amazon SES (Email)',
    description: 'Send emails via Amazon Simple Email Service',
    fields: [
      {
        name: 'accessKeyId',
        label: 'Access Key ID',
        type: 'text',
        required: true,
        placeholder: 'AKIAXXXXXXXXXXXXXXXX',
      },
      {
        name: 'secretAccessKey',
        label: 'Secret Access Key',
        type: 'password',
        required: true,
        placeholder: 'Your AWS secret access key',
      },
      {
        name: 'region',
        label: 'AWS Region',
        type: 'text',
        required: true,
        placeholder: 'us-east-1',
      },
      {
        name: 'fromEmail',
        label: 'From Email',
        type: 'email',
        required: true,
        placeholder: 'noreply@OpsSentinal.com',
      },
    ],
  },
  {
    key: 'firebase',
    name: 'Firebase (Push)',
    description: 'Send push notifications via Firebase Cloud Messaging',
    fields: [
      {
        name: 'projectId',
        label: 'Project ID',
        type: 'text',
        required: true,
        placeholder: 'your-project-id',
      },
      {
        name: 'privateKey',
        label: 'Private Key',
        type: 'textarea',
        required: true,
        placeholder: '-----BEGIN PRIVATE KEY-----\n...',
      },
      {
        name: 'clientEmail',
        label: 'Client Email',
        type: 'email',
        required: true,
        placeholder: 'firebase-adminsdk@...',
      },
    ],
  },
  {
    key: 'onesignal',
    name: 'OneSignal (Push)',
    description: 'Send push notifications via OneSignal',
    fields: [
      {
        name: 'appId',
        label: 'App ID',
        type: 'text',
        required: true,
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
      {
        name: 'apiKey',
        label: 'REST API Key',
        type: 'password',
        required: true,
        placeholder: 'Your OneSignal API key',
      },
    ],
  },
];

export default function SystemNotificationSettings({ providers }: SystemNotificationSettingsProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const providerMap = new Map(providers.map(p => [p.provider, p]));

  // For WhatsApp, we need to read from Twilio provider config
  const twilioProvider = providerMap.get('twilio');
  const whatsappConfig = twilioProvider?.config as Record<string, unknown> | undefined;
  const whatsappEnabled = !!(whatsappConfig?.whatsappEnabled && whatsappConfig?.whatsappNumber);

  // Create a virtual WhatsApp provider entry
  const whatsappProvider: ProviderRecord | undefined = whatsappConfig?.whatsappNumber
    ? {
        id: twilioProvider?.id || '',
        provider: 'whatsapp',
        enabled: whatsappEnabled,
        config: {
          whatsappNumber: whatsappConfig.whatsappNumber,
          whatsappEnabled: whatsappConfig.whatsappEnabled,
          whatsappContentSid: whatsappConfig.whatsappContentSid,
          whatsappAccountSid: whatsappConfig.whatsappAccountSid,
          whatsappAuthToken: whatsappConfig.whatsappAuthToken,
        },
        updatedAt: twilioProvider?.updatedAt || new Date(),
      }
    : undefined;

  return (
    <div className="settings-form-stack">
      {providerConfigs.map(providerConfig => {
        const existing =
          providerConfig.key === 'whatsapp'
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
