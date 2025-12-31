'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';
import { saveOidcConfig } from '@/app/(app)/settings/security/actions';

type Props = {
  initialConfig: {
    enabled: boolean;
    issuer: string | null;
    clientId: string | null;
    autoProvision: boolean;
    allowedDomains: string[];
    hasClientSecret: boolean;
  } | null;
  callbackUrl: string;
  hasEncryptionKey: boolean;
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

export default function SsoSettingsForm({ initialConfig, callbackUrl, hasEncryptionKey }: Props) {
  const [state, formAction] = useActionState<State, FormData>(saveOidcConfig, {
    error: null,
    success: false,
  });
  const [domains, setDomains] = useState((initialConfig?.allowedDomains ?? []).join(', '));

  return (
    <form action={formAction} className="settings-form-stack">
      {!hasEncryptionKey && (
        <div
          className="settings-alert"
          style={{
            border: '1px solid var(--color-warning)',
            color: 'var(--color-warning)',
            background: 'var(--surface-overlay)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.2em' }}>⚠️</span>
          ENCRYPTION_KEY is not configured. Set it before enabling or saving SSO secrets.
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

      <SettingRow
        label="Issuer URL"
        description="Your OIDC issuer URL from the identity provider."
        helpText="Example: https://login.company.com"
      >
        <input
          type="url"
          name="issuer"
          placeholder="https://login.company.com"
          defaultValue={initialConfig?.issuer ?? ''}
        />
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
        description="Stored securely and used to complete OIDC authentication."
        helpText={
          initialConfig?.hasClientSecret
            ? 'Leave blank to keep the current secret.'
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
        helpText="Separate multiple domains with commas or spaces. Leave empty to allow all domains."
      >
        <input
          type="text"
          name="allowedDomains"
          placeholder="example.com, ops.example.com"
          value={domains}
          onChange={event => setDomains(event.target.value)}
        />
      </SettingRow>

      <SettingRow
        label="Callback URL"
        description="Add this URL to your identity provider redirect list."
      >
        <input type="text" readOnly value={callbackUrl} />
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
