'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Switch } from '@/components/ui/shadcn/switch';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/shadcn/card';
import { AlertTriangle, CheckCircle2, Loader2, Copy, ExternalLink, Settings } from 'lucide-react';
import RoleMappingEditor, { type RoleMappingRule } from '@/components/settings/RoleMappingEditor';
import {
  saveOidcConfig,
  validateOidcConnectionAction,
} from '@/app/(app)/settings/security/actions';

type ProfileMapping = {
  department?: string;
  jobTitle?: string;
  avatarUrl?: string;
};

type OidcConfig = {
  enabled: boolean;
  issuer: string | null;
  clientId: string | null;
  autoProvision: boolean;
  allowedDomains: string[];
  hasClientSecret: boolean;
  roleMapping?: unknown;
  customScopes?: string | null;
  providerType?: string | null;
  providerLabel?: string | null;
  profileMapping?: ProfileMapping | null;
};

type Props = {
  initialConfig: OidcConfig | null;
  callbackUrl: string;
  hasEncryptionKey: boolean;
  configError?: string;
};

type State = {
  error?: string | null;
  success?: boolean;
};

type Preset = {
  id: string;
  label: string;
  issuer: string;
  note: string;
};

const PROVIDER_PRESETS: Preset[] = [
  {
    id: 'okta',
    label: 'Okta',
    issuer: 'https://{yourOktaDomain}/oauth2/default',
    note: 'Use your Okta org or custom authorization server.',
  },
  {
    id: 'azure',
    label: 'Azure AD',
    issuer: 'https://login.microsoftonline.com/{tenantId}/v2.0',
    note: 'Replace {tenantId} with your directory ID.',
  },
  {
    id: 'auth0',
    label: 'Auth0',
    issuer: 'https://{tenant}.us.auth0.com/',
    note: 'Use your Auth0 tenant domain.',
  },
  {
    id: 'google',
    label: 'Google',
    issuer: 'https://accounts.google.com',
    note: 'Google Workspace uses a fixed issuer.',
  },
  {
    id: 'custom',
    label: 'Custom',
    issuer: '',
    note: 'Enter the issuer URL from your provider.',
  },
];

type ValidationErrors = {
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? 'Saving...' : 'Save SSO Settings'}
    </Button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="whitespace-nowrap"
      aria-live="polite"
    >
      <Copy className="mr-2 h-4 w-4" />
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function FieldRow({
  label,
  description,
  helpText,
  error,
  children,
  required,
  optional,
}: {
  label: string;
  description?: string;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
      <div>
        <Label className="text-sm font-medium flex items-center gap-2">
          {label}
          {required && (
            <Badge variant="danger" size="xs">
              Required
            </Badge>
          )}
          {optional && (
            <Badge variant="secondary" size="xs">
              Optional
            </Badge>
          )}
        </Label>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
      </div>
      <div className="space-y-2">{children}</div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function SsoSettingsForm({
  initialConfig,
  callbackUrl,
  hasEncryptionKey,
  configError,
}: Props) {
  const [state, formAction] = useActionState<State, FormData>(saveOidcConfig, {
    error: null,
    success: false,
  });
  const initialIssuer = initialConfig?.issuer ?? '';
  const initialClientId = initialConfig?.clientId ?? '';
  const initialDomains = (initialConfig?.allowedDomains ?? []).join(', ');
  const initialEnabled = initialConfig?.enabled ?? false;
  const initialProviderLabel = initialConfig?.providerLabel ?? '';
  const initialCustomScopes = initialConfig?.customScopes ?? '';
  const initialAutoProvision = initialConfig?.autoProvision ?? true;
  const initialRoleMapping = Array.isArray(initialConfig?.roleMapping)
    ? initialConfig?.roleMapping
    : [];

  const [domains, setDomains] = useState(initialDomains);
  const [issuerUrl, setIssuerUrl] = useState(initialIssuer);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [clientIdValue, setClientIdValue] = useState(initialClientId);
  const [clientSecretValue, setClientSecretValue] = useState('');
  const [providerLabelValue, setProviderLabelValue] = useState(initialProviderLabel);
  const [customScopesValue, setCustomScopesValue] = useState(initialCustomScopes);
  const [autoProvision, setAutoProvision] = useState(initialAutoProvision);
  const [selectedPreset, setSelectedPreset] = useState(() => {
    const match = PROVIDER_PRESETS.find(preset => preset.issuer === initialIssuer);
    return match?.id ?? 'custom';
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [lastTested, setLastTested] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [roleMappingPreview, setRoleMappingPreview] =
    useState<RoleMappingRule[]>(initialRoleMapping);
  const [roleMappingResetKey, setRoleMappingResetKey] = useState(0);

  const handleTestConnection = async () => {
    if (!issuerUrl) {
      setTestStatus('error');
      setTestMessage('Enter an issuer URL to test the connection.');
      return;
    }
    setTestStatus('testing');
    setTestMessage('Testing connection...');

    try {
      const result = await validateOidcConnectionAction(issuerUrl);
      if (result.isValid) {
        setTestStatus('success');
        setTestMessage('Connection successful.');
        setLastTested(new Date().toLocaleString());
      } else {
        setTestStatus('error');
        setTestMessage(result.error || 'Connection failed.');
        setLastTested(new Date().toLocaleString());
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Unexpected error while testing.');
      setLastTested(new Date().toLocaleString());
    }
  };

  const enabledTone = enabled ? 'ok' : 'off';
  const enabledLabel = enabled ? 'Enabled' : 'Disabled';
  const clientSecretRequired = !initialConfig?.hasClientSecret;
  const selectedPresetNote =
    PROVIDER_PRESETS.find(preset => preset.id === selectedPreset)?.note ??
    'Enter the issuer URL from your provider.';
  const saveStatus = state?.success ? 'Saved' : state?.error ? 'Save failed' : 'Not saved yet';
  const saveStatusTone = state?.success ? 'ok' : state?.error ? 'warn' : 'off';
  const isRoleMappingDirty =
    JSON.stringify(roleMappingPreview) !== JSON.stringify(initialRoleMapping);
  const isDirty =
    enabled !== initialEnabled ||
    issuerUrl.trim() !== initialIssuer.trim() ||
    clientIdValue.trim() !== initialClientId.trim() ||
    clientSecretValue.trim().length > 0 ||
    domains.trim() !== initialDomains.trim() ||
    providerLabelValue.trim() !== initialProviderLabel.trim() ||
    customScopesValue.trim() !== initialCustomScopes.trim() ||
    autoProvision !== initialAutoProvision ||
    isRoleMappingDirty;
  const isIssuerValid = (value: string) => {
    if (!value.trim()) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  };
  const isSaveDisabled =
    !isIssuerValid(issuerUrl) ||
    !clientIdValue.trim() ||
    (clientSecretRequired && !clientSecretValue.trim());
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) {
      setLastSaved(new Date().toLocaleString());
    }
  }, [state?.success]);

  const validateFields = () => {
    const errors: ValidationErrors = {};
    if (!issuerUrl.trim()) {
      errors.issuer = 'Issuer URL is required.';
    } else if (!isIssuerValid(issuerUrl)) {
      errors.issuer = 'Issuer URL must be a valid HTTPS URL.';
    }
    if (!clientIdValue.trim()) {
      errors.clientId = 'Client ID is required.';
    }
    if (clientSecretRequired && !clientSecretValue.trim()) {
      errors.clientSecret = 'Client secret is required for new configurations.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset.id);
    if (preset.issuer) {
      setIssuerUrl(preset.issuer);
    } else {
      setIssuerUrl('');
    }
    setTestStatus('idle');
    setValidationErrors(current => ({ ...current, issuer: undefined }));
  };

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={event => {
        if (!validateFields()) {
          event.preventDefault();
        }
      }}
      onReset={() => {
        setIssuerUrl(initialIssuer);
        setClientIdValue(initialClientId);
        setClientSecretValue('');
        setDomains(initialDomains);
        setEnabled(initialEnabled);
        setProviderLabelValue(initialProviderLabel);
        setCustomScopesValue(initialCustomScopes);
        setAutoProvision(initialAutoProvision);
        setSelectedPreset(
          PROVIDER_PRESETS.find(preset => preset.issuer === initialIssuer)?.id ?? 'custom'
        );
        setTestStatus('idle');
        setTestMessage('');
        setLastTested(null);
        setValidationErrors({});
        setRoleMappingPreview(initialRoleMapping);
        setRoleMappingResetKey(current => current + 1);
      }}
    >
      {!hasEncryptionKey && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            Encryption key is required before saving SSO secrets.
          </AlertDescription>
        </Alert>
      )}

      {configError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Configuration error:</strong> {configError}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SSO Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={enabled ? 'success' : 'neutral'} size="sm">
              {enabledLabel}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last save</span>
            <Badge
              variant={state?.success ? 'success' : state?.error ? 'danger' : 'neutral'}
              size="xs"
            >
              {saveStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access & Availability</CardTitle>
          <CardDescription>
            Control whether users can sign in with your identity provider. These changes apply to
            every workspace member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={enabled ? 'success' : 'neutral'} size="sm">
                  {enabledLabel}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {enabled ? 'SSO sign-in is active.' : 'SSO sign-in is currently off.'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sso-enabled" className="text-sm font-medium">
                Enable SSO
              </Label>
              <Switch
                id="sso-enabled"
                name="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity Provider</CardTitle>
          <CardDescription>Connect your OIDC issuer and client credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-1">Provider Presets</h4>
              <p className="text-sm text-muted-foreground">
                Start with a known issuer template or choose Custom.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Provider presets">
              {PROVIDER_PRESETS.map(preset => (
                <Button
                  key={preset.id}
                  type="button"
                  variant={selectedPreset === preset.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{selectedPresetNote}</p>
          </div>

          <FieldRow
            label="Custom sign-in label"
            description="Optional label for the sign-in button. Leave empty to auto-detect."
            optional
          >
            <Input
              type="text"
              name="providerLabel"
              placeholder="Auto-detect from issuer"
              value={providerLabelValue}
              onChange={event => setProviderLabelValue(event.target.value)}
            />
          </FieldRow>

          <FieldRow
            label="Issuer URL"
            description="Your OIDC issuer URL from the identity provider."
            helpText="Example: https://login.company.com"
            error={validationErrors.issuer}
            required
          >
            <div className="flex items-center gap-2">
              <Input
                type="url"
                name="issuer"
                placeholder="https://login.company.com"
                value={issuerUrl}
                onChange={event => {
                  setIssuerUrl(event.target.value);
                  setTestStatus('idle');
                  if (validationErrors.issuer) {
                    setValidationErrors(current => ({ ...current, issuer: undefined }));
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing' || !issuerUrl}
              >
                {testStatus === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {testStatus === 'testing' ? 'Testing...' : 'Test connection'}
              </Button>
            </div>
            {testStatus !== 'idle' && (
              <Alert
                className={
                  testStatus === 'success'
                    ? 'bg-green-50 border-green-200'
                    : testStatus === 'error'
                      ? 'bg-red-50 border-red-200'
                      : ''
                }
              >
                {testStatus === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription className={testStatus === 'success' ? 'text-green-700' : ''}>
                  {testMessage}
                  {lastTested && (
                    <span className="block text-xs mt-1">Last tested: {lastTested}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <a
              className="text-xs text-primary hover:underline flex items-center gap-1"
              href="https://openid.net/specs/openid-connect-discovery-1_0.html"
              target="_blank"
              rel="noreferrer"
            >
              Issuer URL docs
              <ExternalLink className="h-3 w-3" />
            </a>
          </FieldRow>

          <FieldRow
            label="Client ID"
            description="OIDC client identifier from your provider."
            error={validationErrors.clientId}
            required
          >
            <Input
              type="text"
              name="clientId"
              placeholder="0oa123abcXYZ"
              value={clientIdValue}
              onChange={event => {
                setClientIdValue(event.target.value);
                if (validationErrors.clientId) {
                  setValidationErrors(current => ({ ...current, clientId: undefined }));
                }
              }}
            />
            <a
              className="text-xs text-primary hover:underline flex items-center gap-1"
              href="https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication"
              target="_blank"
              rel="noreferrer"
            >
              Client ID help
              <ExternalLink className="h-3 w-3" />
            </a>
          </FieldRow>

          <FieldRow
            label="Client Secret"
            description="Stored securely."
            helpText={
              initialConfig?.hasClientSecret
                ? 'Leave blank to keep current secret.'
                : 'Required for new configuration.'
            }
            error={validationErrors.clientSecret}
            required={clientSecretRequired}
            optional={!clientSecretRequired}
          >
            <Input
              type="password"
              name="clientSecret"
              placeholder={initialConfig?.hasClientSecret ? '********' : 'Enter client secret'}
              autoComplete="off"
              value={clientSecretValue}
              onChange={event => {
                setClientSecretValue(event.target.value);
                if (validationErrors.clientSecret) {
                  setValidationErrors(current => ({ ...current, clientSecret: undefined }));
                }
              }}
            />
            <a
              className="text-xs text-primary hover:underline flex items-center gap-1"
              href="https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication"
              target="_blank"
              rel="noreferrer"
            >
              Client secret help
              <ExternalLink className="h-3 w-3" />
            </a>
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provisioning Rules</CardTitle>
          <CardDescription>Define how users are created and approved through SSO.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between pb-6 border-b">
            <div>
              <Label className="text-sm font-medium">Auto-provision users</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Create user accounts automatically on first SSO sign-in.
              </p>
            </div>
            <Switch
              name="autoProvision"
              checked={autoProvision}
              onCheckedChange={setAutoProvision}
            />
          </div>

          <FieldRow
            label="Allowed email domains"
            description="Optional allowlist of domains that can use SSO."
            helpText="Separate multiple domains with commas or spaces."
            optional
          >
            <Input
              type="text"
              name="allowedDomains"
              placeholder="example.com, ops.example.com"
              value={domains}
              onChange={event => setDomains(event.target.value)}
            />
          </FieldRow>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm border-t pt-4">
        <span className="text-muted-foreground">Last updated</span>
        <span className="font-medium">{lastSaved || 'Not saved yet'}</span>
      </div>

      <details className="rounded-lg border bg-card p-6 space-y-4">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-2 -m-6 p-6">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Advanced Mapping</h3>
              <p className="text-sm text-muted-foreground">
                Request extra scopes and map claims to roles or profile fields.
              </p>
            </div>
          </div>
        </summary>
        <div className="space-y-6 pt-4">
          <FieldRow
            label="Custom scopes"
            description="Additional OIDC scopes to request."
            helpText="Standard scopes (openid, email, profile) are always requested."
            optional
          >
            <Input
              type="text"
              name="customScopes"
              placeholder="groups department"
              value={customScopesValue}
              onChange={event => setCustomScopesValue(event.target.value)}
            />
          </FieldRow>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Role Mapping</h4>
              <p className="text-sm text-muted-foreground">
                Assign roles automatically based on OIDC claims.
              </p>
            </div>
            <RoleMappingEditor
              key={roleMappingResetKey}
              initialMappings={initialRoleMapping}
              onChange={setRoleMappingPreview}
            />
            <div className="rounded-lg border bg-muted p-4">
              <div className="text-xs font-semibold text-muted-foreground mb-2">JSON PREVIEW</div>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(roleMappingPreview, null, 2)}
              </pre>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Profile Attribute Mapping</h4>
              <p className="text-sm text-muted-foreground">
                Sync profile data from your identity provider on each login.
              </p>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                Use the exact claim keys from your IdP. Leave empty to skip a field.
              </AlertDescription>
            </Alert>
          </div>

          {enabled ? (
            <>
              <FieldRow
                label="Department claim"
                description="Claim name for user's department."
                optional
              >
                <Input
                  type="text"
                  name="profileMapping.department"
                  placeholder="department"
                  defaultValue={initialConfig?.profileMapping?.department ?? ''}
                />
              </FieldRow>

              <FieldRow
                label="Job title claim"
                description="Claim name for user's job title."
                optional
              >
                <Input
                  type="text"
                  name="profileMapping.jobTitle"
                  placeholder="title"
                  defaultValue={initialConfig?.profileMapping?.jobTitle ?? ''}
                />
              </FieldRow>

              <FieldRow
                label="Avatar URL claim"
                description="Claim name for profile picture URL."
                optional
              >
                <Input
                  type="text"
                  name="profileMapping.avatarUrl"
                  placeholder="picture"
                  defaultValue={initialConfig?.profileMapping?.avatarUrl ?? ''}
                />
              </FieldRow>
            </>
          ) : (
            <Alert className="bg-muted">
              <AlertDescription>
                Enable SSO to configure profile attribute mapping.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Callback URL</CardTitle>
          <CardDescription>Add this URL to your identity provider redirect list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted p-4">
            <h4 className="text-sm font-semibold mb-3">Setup Checklist</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Create an OIDC application in your IdP.</li>
              <li>Copy the Client ID and Client Secret.</li>
              <li>Add the callback URL to your redirect list.</li>
              <li>Test the issuer connection before enabling.</li>
            </ol>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={callbackUrl}
              className="flex-1 font-mono text-sm bg-muted"
            />
            <CopyButton text={callbackUrl} />
          </div>
          <a
            className="text-xs text-primary hover:underline flex items-center gap-1"
            href="https://next-auth.js.org/providers/oidc"
            target="_blank"
            rel="noreferrer"
          >
            OIDC redirect docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      {state?.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state?.success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Settings saved. Complete required fields to enable SSO.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {isDirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        {isDirty && (
          <Button type="reset" variant="ghost">
            Reset
          </Button>
        )}
        <SubmitButton disabled={isSaveDisabled} />
      </div>
    </form>
  );
}
