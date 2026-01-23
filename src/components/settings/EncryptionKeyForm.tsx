'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  Copy,
  Loader2,
} from 'lucide-react';
import { manageEncryptionKey } from '@/app/(app)/settings/system/actions';

type Props = {
  hasKey: boolean;
  isSystemLocked?: boolean;
};

// type State = {
//   error?: string | null;
//   success?: boolean;
// };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? 'Saving...' : 'Save Encryption Key'}
    </Button>
  );
}

export default function EncryptionKeyForm({ hasKey, isSystemLocked }: Props) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bootstrapConfirmed, setBootstrapConfirmed] = useState(false);
  // const [showRotateModal, setShowRotateModal] = useState(false); // Unused
  const [state, formAction] = useActionState(manageEncryptionKey, {});
  const hasPendingChanges = keyInput.length > 0;
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Automatically open edit mode if system is locked (Emergency Recovery)
  // or if no key exists yet (First Time Setup)
  useEffect(() => {
    if (isSystemLocked || !hasKey) {
      setTimeout(() => setIsEditing(true), 0);
    }
  }, [isSystemLocked, hasKey]);

  useEffect(() => {
    if (state?.success) {
      setTimeout(() => setLastSaved(new Date().toLocaleString()), 0);
    }
  }, [state?.success]);

  const isValidKey = (value: string) => /^[0-9a-f]{64}$/i.test(value);
  const keyStatus = keyInput ? (isValidKey(keyInput) ? 'ok' : 'error') : null;



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
    console.log('Key copied to clipboard! Save it securely.');
  };

  return (
    <form action={formAction} className="space-y-6">
      {isSystemLocked && (
        <Alert variant="destructive" className="flex gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="font-semibold text-base">Emergency Recovery Mode</div>
            <AlertDescription className="text-sm leading-relaxed">
              The system has detected a <strong>Critical Key Mismatch</strong>. The stored
              encryption key does not match the verification canary.
            </AlertDescription>
            <p className="text-sm font-semibold mt-2">
              To restore access, you MUST enter the correct Master Key below.
            </p>
          </div>
        </Alert>
      )}

      {/* Bootstrap Warning (No Key Yet) */}
      {!hasKey && (
        <Alert className="bg-orange-50 border-orange-200 text-orange-900">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="space-y-3">
            <div className="font-semibold">First Time Setup</div>
            <p className="text-sm leading-relaxed">
              You are about to generate the <strong>Master Encryption Key</strong>. This key is
              required to decrypt your data. If you lose it, your data is lost forever.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                id="bootstrapConfirm"
                checked={bootstrapConfirmed}
                onChange={e => setBootstrapConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-orange-300"
              />
              <label htmlFor="bootstrapConfirm" className="text-sm font-semibold cursor-pointer">
                I have copied and saved this key in a secure location.
              </label>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!isEditing && hasKey && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="space-y-2">
            <div className="font-semibold text-green-900">Encryption Key is configured.</div>
            <p className="text-sm text-green-700">
              Your system is securing secrets. Changing this key will invalidate all currently
              encrypted data (APIs, SSO secrets, etc).
            </p>
          </AlertDescription>
        </Alert>
      )}

      {isEditing && hasKey && !isSystemLocked && (
        <details className="rounded-lg border bg-card p-4 space-y-3">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-semibold text-sm">Safe Key Rotation</div>
                <p className="text-sm text-muted-foreground">
                  Review the rotation workflow before continuing.
                </p>
              </div>
            </div>
          </summary>
          <div className="mt-4 space-y-3 pl-6 text-sm text-muted-foreground">
            <p>
              The system will attempt to <strong>decrypt all existing secrets</strong> (SSO, Slack,
              etc.) with the old key and re-encrypt them with this new key.
            </p>
            <p>
              This process is atomic. If decryption fails for any reason, the rotation will be
              aborted and your data will remain safe with the old key.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                name="confirm"
                id="rotation-confirm"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label
                htmlFor="rotation-confirm"
                className="text-sm font-medium cursor-pointer text-foreground"
              >
                I allow the system to re-encrypt my data.
              </label>
            </div>
          </div>
        </details>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="encryption-key" className="text-sm font-medium">
            System Encryption Key
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            32-byte hex key used to encrypt sensitive database fields. Must be exactly 64
            hexadecimal characters.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {!isEditing ? (
            // View Mode (Masked)
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="password"
                  value="********************************"
                  disabled
                  readOnly
                  className="font-mono bg-muted cursor-not-allowed opacity-70 pr-20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium select-none">
                  LOCKED
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="whitespace-nowrap"
              >
                {hasKey ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Replace Key
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Generate Key
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center border rounded-lg bg-background overflow-hidden">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    name="encryptionKey"
                    id="encryption-key"
                    placeholder="Click Generate or paste your key"
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    className="flex-1 border-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                  />
                  <div className="flex items-center gap-1 pr-2 border-l pl-2 h-full">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                      className="h-8 w-8 p-0"
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      className="h-8 w-8 p-0"
                      title="Copy to Clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={generateKey}
                  className="whitespace-nowrap"
                >
                  Generate
                </Button>

                {hasKey && !isSystemLocked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setKeyInput('');
                      setShowKey(false);
                      setConfirmed(false);
                    }}
                    className="px-3"
                    aria-label="Cancel"
                    title="Cancel editing"
                  >
                    ✕
                  </Button>
                )}
              </div>

              {keyStatus && (
                <div
                  className={`flex items-center gap-2 text-sm ${keyStatus === 'ok' ? 'text-green-600' : 'text-destructive'}`}
                >
                  {keyStatus === 'ok' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Valid 32-byte key</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      <span>Key must be 64 hex characters</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
            Encryption key saved successfully.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between text-sm border-t pt-4">
        <span className="text-muted-foreground">Last updated</span>
        <span className="font-medium">{lastSaved || 'Not saved yet'}</span>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {hasPendingChanges && (
          <span className="text-sm text-muted-foreground">Unsaved changes</span>
        )}
        {hasPendingChanges && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setKeyInput('');
              setShowKey(false);
              setConfirmed(false);
              setBootstrapConfirmed(false);
            }}
          >
            Reset
          </Button>
        )}
        {/* Disable if:
            1. Bootstrap mode (!hasKey) AND Not confirmed
            2. Rotation mode (hasKey & !Locked) AND Not confirmed
        */}
        <SubmitButton
          disabled={(!hasKey && !bootstrapConfirmed) || (hasKey && !isSystemLocked && !confirmed)}
        />
      </div>
    </form>
  );
}
