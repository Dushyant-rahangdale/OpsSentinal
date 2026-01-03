'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';
import { manageEncryptionKey } from '@/app/(app)/settings/system/actions';

type Props = {
  hasKey: boolean;
  isSystemLocked?: boolean;
};

type State = {
  error?: string | null;
  success?: boolean;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="settings-primary-button" type="submit" disabled={pending || disabled}>
      {pending ? 'Saving...' : 'Save Encryption Key'}
    </button>
  );
}

export default function EncryptionKeyForm({ hasKey, isSystemLocked }: Props) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bootstrapConfirmed, setBootstrapConfirmed] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [state, formAction] = useActionState(manageEncryptionKey, {});

  // Automatically open edit mode if system is locked (Emergency Recovery)
  useEffect(() => {
    if (isSystemLocked) {
      setIsEditing(true);
    }
  }, [isSystemLocked]);

  const generateKey = () => {
    // Generate a random 32-byte hex string
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hex = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setKeyInput(hex);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(keyInput);
    alert('Key copied to clipboard! Save it securely.');
  };

  return (
    <form action={formAction} className="settings-form-stack">
      {isSystemLocked && (
        <div
          className="settings-alert"
          style={{
            border: '1px solid #fee2e2',
            background: '#fef2f2',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '1.5em' }}>⚠️</div>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1em' }}>
              Emergency Recovery Mode
            </strong>
            <p style={{ fontSize: '0.95em', lineHeight: '1.5' }}>
              The system has detected a <strong>Critical Key Mismatch</strong>. The stored
              encryption key does not match the verification canary.
            </p>
            <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>
              To restore access, you MUST enter the correct Master Key below.
            </p>
          </div>
        </div>
      )}

      {/* Bootstrap Warning (No Key Yet) */}
      {!hasKey && (
        <div
          className="settings-alert"
          style={{
            background: '#fff7ed',
            borderColor: '#fdba74',
            color: '#9a3412',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>⚠️ First Time Setup</strong>
          <p style={{ fontSize: '0.95em' }}>
            You are about to generate the <strong>Master Encryption Key</strong>. This key is
            required to decrypt your data. If you lose it, your data is lost forever.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="bootstrapConfirm"
              checked={bootstrapConfirmed}
              onChange={e => setBootstrapConfirmed(e.target.checked)}
            />
            <label
              htmlFor="bootstrapConfirm"
              style={{ fontSize: '0.9em', cursor: 'pointer', fontWeight: 600 }}
            >
              I have copied and saved this key in a secure location.
            </label>
          </div>
        </div>
      )}

      {!isEditing && hasKey && (
        <div
          className="settings-alert"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
          }}
        >
          <strong>✅ Encryption Key is configured.</strong>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
            Your system is securing secrets. Changing this key will invalidate all currently
            encrypted data (APIs, SSO secrets, etc).
          </p>
        </div>
      )}

      {isEditing && hasKey && !isSystemLocked && (
        <div
          className="settings-alert"
          style={{
            border: '1px solid var(--color-info)',
            background: 'var(--surface-overlay)',
            color: 'var(--text-primary)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
          }}
        >
          <strong style={{ fontSize: '1.1em', color: 'var(--color-info)' }}>
            🔄 Safe Key Rotation
          </strong>
          <p style={{ margin: '0.5rem 0', fontSize: '0.95em' }}>
            The system will attempt to <strong>decrypt all existing secrets</strong> (SSO, Slack,
            etc.) with the old key and re-encrypt them with this new key.
          </p>
          <p style={{ fontSize: '0.95em', marginBottom: '1rem' }}>
            This process is atomic. If decryption fails for any reason, the rotation will be aborted
            and your data will remain safe with the old key.
          </p>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <input
              type="checkbox"
              name="confirm"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              style={{ width: '1.2em', height: '1.2em' }}
            />
            I allow the system to re-encrypt my data.
          </label>
        </div>
      )}

      <SettingRow
        label="System Encryption Key"
        description="32-byte hex key used to encrypt sensitive database fields."
        helpText="Must be exactly 64 hexadecimal characters."
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!isEditing ? (
            // View Mode (Masked)
            <>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="password"
                  value="********************************"
                  disabled
                  readOnly
                  style={{
                    paddingRight: '2.5rem',
                    fontFamily: 'monospace',
                    background: 'var(--bg-secondary)',
                    cursor: 'not-allowed',
                    opacity: 0.7,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.85em',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                    userSelect: 'none',
                  }}
                >
                  LOCKED
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="settings-secondary-button"
                style={{ whiteSpace: 'nowrap' }}
              >
                Replace Key
              </button>
            </>
          ) : (
            // Edit Mode
            <>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  name="encryptionKey"
                  placeholder="Enter or generate new key"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  style={{ paddingRight: '5.5rem', fontFamily: 'monospace' }}
                  autoFocus
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    gap: '0.25rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                    title="Copy to Clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={generateKey}
                className="settings-secondary-button"
                style={{ whiteSpace: 'nowrap' }}
              >
                Generate
              </button>
              {hasKey && !isSystemLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setKeyInput('');
                    setShowKey(false);
                    setConfirmed(false);
                  }}
                  className="settings-secondary-button"
                  aria-label="Cancel"
                  title="Cancel editing"
                  style={{ padding: '0 0.75rem' }}
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>
      </SettingRow>

      {(state?.error || state?.success) && (
        <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
          {state?.error ? state.error : 'Encryption key saved successfully.'}
        </div>
      )}

      <StickyActionBar>
        {/* Disable if: 
            1. Bootstrap mode (!hasKey) AND Not confirmed
            2. Rotation mode (hasKey & !Locked) AND Not confirmed
        */}
        <SubmitButton
          disabled={(!hasKey && !bootstrapConfirmed) || (hasKey && !isSystemLocked && !confirmed)}
        />
      </StickyActionBar>
    </form>
  );
}
