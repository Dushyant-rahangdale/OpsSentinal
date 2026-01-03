'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ToastProvider';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';

type Props = {
  appUrl: string | null;
  fallback: string;
};

export default function AppUrlSettings({ appUrl, fallback }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const initialValue = appUrl || '';
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const isDirty = value !== initialValue;

  const isValidUrl = (input: string) => {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  };

  const urlStatus = value ? (isValidUrl(value) ? 'ok' : 'error') : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/settings/app-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appUrl: value }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update app URL');
      }

      showToast('Application URL updated successfully', 'success');
      setLastSaved(new Date().toLocaleString());
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update app URL', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="settings-form-stack">
      <SettingRow
        label="Application URL"
        description="The base URL used in emails, webhooks, and RSS feeds."
        helpText={!value ? `Using fallback: ${fallback}` : undefined}
      >
        <input
          type="url"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          placeholder={fallback}
        />
        {urlStatus && (
          <div className={`settings-field-status ${urlStatus}`}>
            {urlStatus === 'ok' ? 'URL looks valid' : 'Enter a valid URL'}
          </div>
        )}
        {value && (
          <button type="button" className="settings-link-button" onClick={() => setValue('')}>
            Clear (use fallback)
          </button>
        )}
      </SettingRow>

      <div className="settings-divider" />

      <div className="settings-priority-card">
        <strong>Priority order</strong>
        <ol>
          <li>Database configuration (this setting)</li>
          <li>Environment variable (NEXT_PUBLIC_APP_URL)</li>
          <li>Fallback to localhost (development only)</li>
        </ol>
      </div>

      <div className="settings-meta-row">
        <span>Last updated</span>
        <span>{lastSaved || 'Not saved yet'}</span>
      </div>

      <StickyActionBar>
        {isDirty && <div className="settings-action-note">Unsaved changes</div>}
        {isDirty && (
          <button
            type="button"
            className="settings-link-button"
            onClick={() => setValue(initialValue)}
            disabled={isLoading}
          >
            Reset
          </button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading || !isDirty}
        >
          Save URL
        </Button>
      </StickyActionBar>
    </form>
  );
}
