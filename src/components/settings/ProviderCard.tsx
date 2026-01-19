'use client';

import { useState } from 'react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Switch } from '@/components/ui/shadcn/switch';
import { Badge } from '@/components/ui/shadcn/badge';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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

  const [enabled, setEnabled] = useState(initialEnabled);
  const [config, setConfig] = useState<Record<string, unknown>>(
    (existing?.config as Record<string, unknown>) || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateNotice, setGenerateNotice] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const hasRequiredConfig =
    Object.keys(config).length > 0 &&
    providerConfig.fields
      .filter(f => f.required)
      .every(f => {
        const value = config[f.name];
        return value && String(value).trim() !== '';
      });

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

  const handleToggleEnabled = async (checked: boolean) => {
    const newEnabled = checked;

    // Check if provider is configured before enabling
    if (newEnabled && !hasRequiredConfig) {
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
      alert(
        `Failed to ${newEnabled ? 'enable' : 'disable'} provider: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  const isWebPush = providerConfig.key === 'web-push';
  const hasVapidKeys =
    typeof config.vapidPublicKey === 'string' &&
    config.vapidPublicKey.trim() !== '' &&
    typeof config.vapidPrivateKey === 'string' &&
    config.vapidPrivateKey.trim() !== '';
  const legacyKeyCount = Array.isArray(config.vapidKeyHistory) ? config.vapidKeyHistory.length : 0;

  const handleGenerateVapid = async () => {
    setIsGenerating(true);
    setGenerateNotice(null);
    setGenerateError(null);
    setError(null);

    try {
      const { generateVapidKeys } = await import('@/app/(app)/settings/system/actions');
      const subjectValue = typeof config.vapidSubject === 'string' ? config.vapidSubject : '';
      const result = await generateVapidKeys({
        subject: subjectValue,
        rotate: hasVapidKeys,
        keepPrevious: true,
      });

      setConfig(prev => ({
        ...prev,
        vapidPublicKey: result.publicKey,
        vapidPrivateKey: result.privateKey,
        vapidSubject: result.subject,
      }));

      setGenerateNotice(
        hasVapidKeys
          ? 'Keys rotated. Existing devices continue to work; new devices use the latest key.'
          : 'VAPID keys generated and saved.'
      );
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Failed to generate VAPID keys. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{providerConfig.name}</CardTitle>
              <Badge
                variant={enabled ? 'default' : 'secondary'}
                className={enabled ? 'bg-green-600' : ''}
              >
                {enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <CardDescription>{providerConfig.description}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={isSaving || (!enabled && !hasRequiredConfig)}
              />
              <span className="text-sm text-muted-foreground">{enabled ? 'On' : 'Off'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onToggle}>
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Configure
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={enabled}
                onCheckedChange={checked => setEnabled(!!checked)}
                id={`enable-${providerConfig.key}`}
              />
              <Label
                htmlFor={`enable-${providerConfig.key}`}
                className="text-sm font-medium cursor-pointer"
              >
                Enable {providerConfig.name}
              </Label>
            </div>

            {isWebPush && (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">VAPID keys</p>
                    <p className="text-xs text-muted-foreground">
                      Generate or rotate the key pair for web push. Rotations keep existing devices
                      working by retaining previous keys.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateVapid}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {hasVapidKeys ? 'Rotate keys' : 'Generate keys'}
                  </Button>
                </div>
                {hasVapidKeys && (
                  <div className="text-xs text-muted-foreground">
                    Legacy keys retained: {legacyKeyCount}
                  </div>
                )}
                {generateNotice && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">{generateNotice}</AlertDescription>
                  </Alert>
                )}
                {generateError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{generateError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {enabled && (
              <div className="space-y-4 border-t pt-4">
                {providerConfig.fields.map(field => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={field.name}
                        value={(config[field.name] as string) || ''}
                        onChange={e => setConfig({ ...config, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        required={field.required && enabled}
                        rows={4}
                        className="font-mono text-sm"
                      />
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={field.name}
                          checked={(config[field.name] as boolean) || false}
                          onCheckedChange={checked =>
                            setConfig({ ...config, [field.name]: !!checked })
                          }
                        />
                        <Label htmlFor={field.name} className="font-normal cursor-pointer">
                          {field.label}
                        </Label>
                      </div>
                    ) : (
                      <Input
                        id={field.name}
                        type={field.type}
                        value={(config[field.name] as string) || ''}
                        onChange={e => setConfig({ ...config, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        required={field.required && enabled}
                        className={field.type === 'password' ? 'font-mono' : ''}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex-1">
                {saveStatus === 'success' && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Saved successfully
                    </AlertDescription>
                  </Alert>
                )}
                {saveStatus === 'error' && error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
              <Button type="submit" disabled={isSaving} className="ml-4">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      )}

      {existing && !isExpanded && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Last updated: {formatDateTime(existing.updatedAt, userTimeZone, { format: 'datetime' })}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
