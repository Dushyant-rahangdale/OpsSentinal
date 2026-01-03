'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';
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
    <button className="settings-primary-button" type="submit" disabled={pending || disabled}>
      {pending ? 'Saving...' : 'Save SSO Settings'}
    </button>
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
    <button
      type="button"
      onClick={handleCopy}
      className="sso-settings-copy-button"
      aria-live="polite"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
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
      className="settings-form-stack sso-settings-form"
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
        <div className="settings-alert warning">
          Encryption key is required before saving SSO secrets.
        </div>
      )}

      {configError && (
        <div className="settings-alert error">
          <strong>Configuration error:</strong> {configError}
        </div>
      )}

      <div className="sso-settings-summary">
        <div className="sso-settings-summary-title">SSO overview</div>
        <div className="sso-settings-summary-row">
          <span>Status</span>
          <span className={`sso-settings-pill is-${enabledTone}`}>{enabledLabel}</span>
        </div>
        <div className="sso-settings-summary-row">
          <span>Last save</span>
          <span className={`sso-settings-pill is-${saveStatusTone}`}>{saveStatus}</span>
        </div>
      </div>

      <section className="sso-settings-banner">
        <div className="sso-settings-banner-copy">
          <h3>Access & availability</h3>
          <p>
            Control whether users can sign in with your identity provider. These changes apply to
            every workspace member.
          </p>
        </div>
        <div className="sso-settings-banner-actions">
          <div className="sso-settings-status">
            <span className={`sso-settings-pill is-${enabledTone}`}>{enabledLabel}</span>
            <span className="sso-settings-status-note">
              {enabled ? 'SSO sign-in is active.' : 'SSO sign-in is currently off.'}
            </span>
          </div>
          <label className="sso-settings-toggle">
            <input
              type="checkbox"
              name="enabled"
              checked={enabled}
              onChange={event => setEnabled(event.target.checked)}
            />
            <span className="sso-settings-toggle-slider" />
            <span className="sso-settings-toggle-label">Enable SSO</span>
          </label>
        </div>
      </section>

      <section className="sso-settings-panel">
        <div className="sso-settings-panel-header">
          <div>
            <h3>Identity provider</h3>
            <p>Connect your OIDC issuer and client credentials.</p>
          </div>
        </div>
        <div className="sso-settings-panel-body">
          <div className="sso-settings-presets">
            <div className="sso-settings-presets-header">
              <div>
                <h4>Provider presets</h4>
                <p>Start with a known issuer template or choose Custom.</p>
              </div>
            </div>
            <div className="sso-settings-presets-grid" role="group" aria-label="Provider presets">
              {PROVIDER_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  className={`sso-settings-preset ${selectedPreset === preset.id ? 'is-active' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="sso-settings-preset-note">{selectedPresetNote}</div>
          </div>

          <SettingRow
            label="Custom sign-in label"
            description="Optional label for the sign-in button. Leave empty to auto-detect."
          >
            <div className="sso-settings-field-meta">
              <span className="sso-settings-field-tag is-optional">Optional</span>
            </div>
            <input
              type="text"
              name="providerLabel"
              placeholder="Auto-detect from issuer"
              value={providerLabelValue}
              onChange={event => setProviderLabelValue(event.target.value)}
            />
          </SettingRow>

          <SettingRow
            label="Issuer URL"
            description="Your OIDC issuer URL from the identity provider."
            helpText="Example: https://login.company.com"
            error={validationErrors.issuer}
          >
            <div className="sso-settings-inline">
              <span className="sso-settings-field-tag is-required">Required</span>
              <input
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
              />
              <button
                type="button"
                id="sso-test-connection"
                onClick={handleTestConnection}
                className="sso-settings-ghost-button"
                disabled={testStatus === 'testing' || !issuerUrl}
              >
                {testStatus === 'testing' ? 'Testing...' : 'Test connection'}
              </button>
            </div>
            {testStatus !== 'idle' && (
              <div className={`sso-settings-test is-${testStatus}`}>
                <span>{testMessage}</span>
                {lastTested && (
                  <span className="sso-settings-test-time">Last tested {lastTested}</span>
                )}
              </div>
            )}
            {testStatus === 'success' && (
              <div className="settings-field-status ok">Connection verified</div>
            )}
            <a
              className="sso-settings-docs-link"
              href="https://openid.net/specs/openid-connect-discovery-1_0.html"
              target="_blank"
              rel="noreferrer"
            >
              Issuer URL docs
            </a>
          </SettingRow>

          <SettingRow
            label="Client ID"
            description="OIDC client identifier from your provider."
            error={validationErrors.clientId}
          >
            <div className="sso-settings-field-meta">
              <span className="sso-settings-field-tag is-required">Required</span>
            </div>
            <input
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
              className="sso-settings-docs-link"
              href="https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication"
              target="_blank"
              rel="noreferrer"
            >
              Client ID help
            </a>
          </SettingRow>

          <SettingRow
            label="Client Secret"
            description="Stored securely."
            helpText={
              initialConfig?.hasClientSecret
                ? 'Leave blank to keep current secret.'
                : 'Required for new configuration.'
            }
            error={validationErrors.clientSecret}
          >
            <div className="sso-settings-field-meta">
              <span
                className={`sso-settings-field-tag ${clientSecretRequired ? 'is-required' : 'is-optional'}`}
              >
                {clientSecretRequired ? 'Required' : 'Optional'}
              </span>
            </div>
            <input
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
              className="sso-settings-docs-link"
              href="https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication"
              target="_blank"
              rel="noreferrer"
            >
              Client secret help
            </a>
          </SettingRow>
        </div>
      </section>

      <section className="sso-settings-panel">
        <div className="sso-settings-panel-header">
          <div>
            <h3>Provisioning rules</h3>
            <p>Define how users are created and approved through SSO.</p>
          </div>
        </div>
        <div className="sso-settings-panel-body">
          <SettingRow
            label="Auto-provision users"
            description="Create user accounts automatically on first SSO sign-in."
          >
            <label className="sso-settings-toggle">
              <input
                type="checkbox"
                name="autoProvision"
                checked={autoProvision}
                onChange={event => setAutoProvision(event.target.checked)}
              />
              <span className="sso-settings-toggle-slider" />
            </label>
          </SettingRow>

          <SettingRow
            label="Allowed email domains"
            description="Optional allowlist of domains that can use SSO."
            helpText="Separate multiple domains with commas or spaces."
          >
            <div className="sso-settings-field-meta">
              <span className="sso-settings-field-tag is-optional">Optional</span>
            </div>
            <input
              type="text"
              name="allowedDomains"
              placeholder="example.com, ops.example.com"
              value={domains}
              onChange={event => setDomains(event.target.value)}
            />
          </SettingRow>
        </div>
      </section>

      <div className="settings-meta-row">
        <span>Last updated</span>
        <span>{lastSaved || 'Not saved yet'}</span>
      </div>

      <details className="sso-settings-advanced">
        <summary>
          <div>
            <h3>Advanced mapping</h3>
            <p>Request extra scopes and map claims to roles or profile fields.</p>
          </div>
        </summary>
        <div className="sso-settings-advanced-body">
          <SettingRow
            label="Custom scopes"
            description="Additional OIDC scopes to request."
            helpText="Standard scopes (openid, email, profile) are always requested."
          >
            <div className="sso-settings-field-meta">
              <span className="sso-settings-field-tag is-optional">Optional</span>
            </div>
            <input
              type="text"
              name="customScopes"
              placeholder="groups department"
              value={customScopesValue}
              onChange={event => setCustomScopesValue(event.target.value)}
            />
          </SettingRow>

          <div className="sso-settings-subsection">
            <div className="sso-settings-subheader">
              <h4>Role mapping</h4>
              <p>Assign roles automatically based on OIDC claims.</p>
            </div>
            <RoleMappingEditor
              key={roleMappingResetKey}
              initialMappings={initialRoleMapping}
              onChange={setRoleMappingPreview}
            />
            <div className="sso-settings-json">
              <div className="sso-settings-json-header">JSON preview</div>
              <pre>{JSON.stringify(roleMappingPreview, null, 2)}</pre>
            </div>
          </div>

          <div className="sso-settings-subsection">
            <div className="sso-settings-subheader">
              <h4>Profile attribute mapping</h4>
              <p>Sync profile data from your identity provider on each login.</p>
            </div>
            <div className="sso-settings-callout">
              Use the exact claim keys from your IdP. Leave empty to skip a field.
            </div>
          </div>

          {enabled ? (
            <>
              <SettingRow label="Department claim" description="Claim name for user's department.">
                <div className="sso-settings-field-meta">
                  <span className="sso-settings-field-tag is-optional">Optional</span>
                </div>
                <input
                  type="text"
                  name="profileMapping.department"
                  placeholder="department"
                  defaultValue={initialConfig?.profileMapping?.department ?? ''}
                />
              </SettingRow>

              <SettingRow label="Job title claim" description="Claim name for user's job title.">
                <div className="sso-settings-field-meta">
                  <span className="sso-settings-field-tag is-optional">Optional</span>
                </div>
                <input
                  type="text"
                  name="profileMapping.jobTitle"
                  placeholder="title"
                  defaultValue={initialConfig?.profileMapping?.jobTitle ?? ''}
                />
              </SettingRow>

              <SettingRow
                label="Avatar URL claim"
                description="Claim name for profile picture URL."
              >
                <div className="sso-settings-field-meta">
                  <span className="sso-settings-field-tag is-optional">Optional</span>
                </div>
                <input
                  type="text"
                  name="profileMapping.avatarUrl"
                  placeholder="picture"
                  defaultValue={initialConfig?.profileMapping?.avatarUrl ?? ''}
                />
              </SettingRow>
            </>
          ) : (
            <div className="sso-settings-disabled-note">
              Enable SSO to configure profile attribute mapping.
            </div>
          )}
        </div>
      </details>

      <section className="sso-settings-panel">
        <div className="sso-settings-panel-header">
          <div>
            <h3>Callback URL</h3>
            <p>Add this URL to your identity provider redirect list.</p>
          </div>
        </div>
        <div className="sso-settings-panel-body">
          <div className="sso-settings-checklist">
            <h4>Setup checklist</h4>
            <ol>
              <li>Create an OIDC application in your IdP.</li>
              <li>Copy the Client ID and Client Secret.</li>
              <li>Add the callback URL to your redirect list.</li>
              <li>Test the issuer connection before enabling.</li>
            </ol>
          </div>
          <div className="sso-settings-inline">
            <input type="text" readOnly value={callbackUrl} className="sso-settings-readonly" />
            <CopyButton text={callbackUrl} />
          </div>
          <a
            className="sso-settings-docs-link"
            href="https://next-auth.js.org/providers/oidc"
            target="_blank"
            rel="noreferrer"
          >
            OIDC redirect docs
          </a>
        </div>
      </section>

      {(state?.error || state?.success) && (
        <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
          {state?.error ? state.error : 'Settings saved. Complete required fields to enable SSO.'}
        </div>
      )}

      <StickyActionBar>
        {isDirty && <div className="settings-action-note">Unsaved changes</div>}
        {isDirty && (
          <button type="reset" className="settings-link-button">
            Reset
          </button>
        )}
        <SubmitButton disabled={isSaveDisabled} />
      </StickyActionBar>
    </form>
  );
}
