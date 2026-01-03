'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';
import RoleMappingEditor from '@/components/settings/RoleMappingEditor';
import {
  saveOidcConfig,
  validateOidcConnectionAction,
} from '@/app/(app)/settings/security/actions';

type Props = {
  initialConfig: {
    enabled: boolean;
    issuer: string | null;
    clientId: string | null;
    autoProvision: boolean;
    allowedDomains: string[];
    hasClientSecret: boolean;
    roleMapping?: any;
    customScopes?: string | null;
    providerType?: string | null;
    providerLabel?: string | null;
    profileMapping?: Record<string, string> | null;
  } | null;
  callbackUrl: string;
  hasEncryptionKey: boolean;
  configError?: string;
};

type State = {
  error?: string | null;
  success?: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="settings-primary-button" type="submit" disabled={pending}>
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
      className="settings-secondary-button"
      style={{ minWidth: '80px' }}
    >
      {copied ? 'Copied!' : 'Copy'}
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
  const [domains, setDomains] = useState((initialConfig?.allowedDomains ?? []).join(', '));
  const [issuerUrl, setIssuerUrl] = useState(initialConfig?.issuer ?? '');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleTestConnection = async () => {
    if (!issuerUrl) {
      setTestStatus('error');
      setTestMessage('Please enter an Issuer URL first.');
      return;
    }
    setTestStatus('testing');
    setTestMessage('Connecting...');

    try {
      const result = await validateOidcConnectionAction(issuerUrl);
      if (result.isValid) {
        setTestStatus('success');
        setTestMessage('✓ Connection Successful');
      } else {
        setTestStatus('error');
        setTestMessage('✕ ' + (result.error || 'Connection failed'));
      }
    } catch {
      setTestStatus('error');
      setTestMessage('✕ Unexpected error');
    }
  };

  return (
    <form action={formAction} className="settings-form-stack">
      {!hasEncryptionKey && (
        <div className="settings-alert warning">
          <span style={{ fontSize: '1.2em' }}>⚠️</span>
          ENCRYPTION_KEY is not configured. Set it before enabling or saving SSO secrets.
        </div>
      )}

      {configError && (
        <div className="settings-alert error">
          <span style={{ fontSize: '1.2em' }}>⛔</span>
          <div>
            <strong>Configuration Error: </strong> {configError}
          </div>
        </div>
      )}

      <SettingRow
        label="Enable SSO"
        description="Allow users to sign in with your identity provider."
      >
        <label className="settings-toggle">
          <input type="checkbox" name="enabled" defaultChecked={initialConfig?.enabled ?? false} />
          <span className="settings-toggle-slider" />
        </label>
      </SettingRow>

      <div className="settings-separator"></div>

      {/* Connection Settings Section */}
      <div className="settings-section-header">
        <h3>🔗 Connection Settings</h3>
        <p>Configure your identity provider connection details.</p>
      </div>

      <SettingRow
        label="Custom SSO Button Label"
        description="Optional custom label for the SSO button (e.g., 'Acme Corp SSO'). If empty, the provider name will be detected from the Issuer URL."
      >
        <input
          type="text"
          name="providerLabel"
          placeholder="Leave empty for auto-detection"
          defaultValue={initialConfig?.providerLabel ?? ''}
        />
      </SettingRow>

      <SettingRow
        label="Issuer URL"
        description="Your OIDC issuer URL from the identity provider."
        helpText="Example: https://login.company.com"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="url"
              name="issuer"
              placeholder="https://login.company.com"
              value={issuerUrl}
              onChange={e => {
                setIssuerUrl(e.target.value);
                setTestStatus('idle');
              }}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleTestConnection}
              className="settings-secondary-button"
              disabled={testStatus === 'testing' || !issuerUrl}
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test'}
            </button>
          </div>
          {testStatus !== 'idle' && (
            <div
              style={{
                fontSize: '0.85rem',
                color: testStatus === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                fontWeight: 500,
              }}
            >
              {testMessage}
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow label="Client ID" description="OIDC client identifier from your provider.">
        <input
          type="text"
          name="clientId"
          placeholder="0oa123abcXYZ"
          defaultValue={initialConfig?.clientId ?? ''}
        />
      </SettingRow>

      <SettingRow
        label="Client Secret"
        description="Stored securely."
        helpText={
          initialConfig?.hasClientSecret
            ? 'Leave blank to keep current secret.'
            : 'Required for new configuration.'
        }
      >
        <input
          type="password"
          name="clientSecret"
          placeholder={initialConfig?.hasClientSecret ? '********' : 'Enter client secret'}
          autoComplete="off"
        />
      </SettingRow>

      <div className="settings-separator"></div>

      {/* User Provisioning Section */}
      <div className="settings-section-header">
        <h3>👤 User Provisioning</h3>
        <p>Control how users are created and managed via SSO.</p>
      </div>

      <SettingRow
        label="Auto-provision users"
        description="Create user accounts automatically on first SSO sign-in."
      >
        <label className="settings-toggle">
          <input
            type="checkbox"
            name="autoProvision"
            defaultChecked={initialConfig?.autoProvision ?? true}
          />
          <span className="settings-toggle-slider" />
        </label>
      </SettingRow>

      <SettingRow
        label="Allowed email domains"
        description="Optional allowlist of domains that can use SSO."
        helpText="Separate multiple domains with commas or spaces."
      >
        <input
          type="text"
          name="allowedDomains"
          placeholder="example.com, ops.example.com"
          value={domains}
          onChange={event => setDomains(event.target.value)}
        />
      </SettingRow>

      <div className="settings-separator"></div>

      {/* Advanced Settings Section */}
      <div className="settings-section-header">
        <h3>⚙️ Advanced Settings</h3>
        <p>Request additional scopes and configure attribute mappings.</p>
      </div>

      <SettingRow
        label="Custom Scopes"
        description="Additional OIDC scopes to request."
        helpText="Standard scopes (openid, email, profile) are always requested."
      >
        <input
          type="text"
          name="customScopes"
          placeholder="groups department"
          defaultValue={initialConfig?.customScopes ?? ''}
        />
      </SettingRow>

      <div className="settings-separator"></div>

      <div className="settings-section-header">
        <h3>📋 Role Mapping</h3>
        <p>Automatically assign roles based on OIDC claims.</p>
      </div>

      <RoleMappingEditor initialMappings={initialConfig?.roleMapping} />

      <div className="settings-separator"></div>

      <div className="settings-section-header">
        <h3>🔄 Profile Attribute Mapping</h3>
        <p>
          Map OIDC claims to user profile fields. When a user logs in, their profile will be
          automatically updated with values from your identity provider.
        </p>
        <div
          className="settings-alert"
          style={{ marginTop: '0.75rem', background: 'var(--bg-tertiary)' }}
        >
          <span style={{ fontSize: '1.1em' }}>💡</span>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>How it works:</strong> Enter the exact claim name from your IdP. Common
            examples: <code>department</code>, <code>title</code>, <code>picture</code>. Leave empty
            to skip syncing that field.
          </div>
        </div>
      </div>

      <SettingRow
        label="Department Claim"
        description="Claim name for user's department (e.g., 'department' for Azure AD, custom for Okta)"
      >
        <input
          type="text"
          name="profileMapping.department"
          placeholder="e.g., department"
          defaultValue={initialConfig?.profileMapping?.department ?? ''}
        />
      </SettingRow>

      <SettingRow
        label="Job Title Claim"
        description="Claim name for user's job title (e.g., 'jobTitle' for Azure AD, 'title' for others)"
      >
        <input
          type="text"
          name="profileMapping.jobTitle"
          placeholder="e.g., title or jobTitle"
          defaultValue={initialConfig?.profileMapping?.jobTitle ?? ''}
        />
      </SettingRow>

      <SettingRow
        label="Avatar URL Claim"
        description="Claim name for profile picture URL (e.g., 'picture' for Google/Auth0)"
      >
        <input
          type="text"
          name="profileMapping.avatarUrl"
          placeholder="e.g., picture"
          defaultValue={initialConfig?.profileMapping?.avatarUrl ?? ''}
        />
      </SettingRow>

      <div className="settings-separator"></div>

      <SettingRow
        label="Callback URL"
        description="Add this URL to your identity provider redirect list."
      >
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <input
            type="text"
            readOnly
            value={callbackUrl}
            style={{ flex: 1, background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
          />
          <CopyButton text={callbackUrl} />
        </div>
      </SettingRow>

      {(state?.error || state?.success) && (
        <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
          {state?.error ? state.error : 'SSO settings saved successfully.'}
        </div>
      )}

      <StickyActionBar>
        <SubmitButton />
      </StickyActionBar>
    </form>
  );
}
