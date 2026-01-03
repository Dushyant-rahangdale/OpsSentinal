'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SetupStep = 1 | 2 | 3;

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://yourdomain.com';
}

export default function GuidedSlackSetup() {
  const [step, setStep] = useState<SetupStep>(1);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const redirectUri = `${getBaseUrl()}/api/slack/oauth/callback`;

  const handleSave = async () => {
    if (!clientId || !clientSecret) {
      // eslint-disable-next-line no-alert
      alert('Please enter both Client ID and Client Secret');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('clientSecret', clientSecret);
      formData.append('redirectUri', redirectUri);
      formData.append('enabled', 'true');

      const response = await fetch('/api/settings/slack-oauth', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        router.refresh();
        setStep(3);
      } else {
        const error = await response.json();
        // eslint-disable-next-line no-alert
        alert(error.error || 'Failed to save configuration');
      }
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    // eslint-disable-next-line no-alert
    alert('Redirect URI copied to clipboard!');
  };

  return (
    <div className="settings-slack-setup">
      <div className="settings-slack-setup-header">
        <div className="settings-slack-icon info" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165V11.91h5.042v3.255zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.52 2.523v6.745H6.313v-6.745zm2.521-5.306V5.841a2.528 2.528 0 0 1 2.52-2.523h2.522a2.528 2.528 0 0 1 2.521 2.523v4.018H10.355zm5.208 0V5.841a2.528 2.528 0 0 0-2.521-2.523h-2.522a2.528 2.528 0 0 0-2.52 2.523v4.018h7.563zm2.522 5.306V11.91H24v3.255a2.528 2.528 0 0 1-2.521 2.523 2.528 2.528 0 0 1-2.52-2.523zm-2.522-5.306V5.841A2.528 2.528 0 0 0 15.624 3.318h-2.522a2.528 2.528 0 0 0-2.521 2.523v4.018h7.563z" />
          </svg>
        </div>
        <h2>Connect Slack Workspace</h2>
        <p>Follow these simple steps to connect Slack. Takes less than 2 minutes!</p>
      </div>

      {/* Step Indicator */}
      <div className="settings-slack-stepper">
        {[1, 2, 3].map(s => (
          <div key={s} className="settings-slack-step">
            <div className={`settings-slack-step-number ${step >= s ? 'active' : ''}`}>
              {step > s ? 'OK' : s}
            </div>
            {s < 3 && <div className={`settings-slack-step-line ${step > s ? 'active' : ''}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Create Slack App */}
      {step === 1 && (
        <div className="settings-slack-step-card">
          <h3>Step 1: Create a Slack App</h3>
          <div className="settings-form-grid">
            <div className="settings-slack-step-section">
              <p>
                <strong>1.</strong> Click the button below to open Slack API in a new tab
              </p>
              <div className="settings-slack-cta">
                <a
                  href="https://api.slack.com/apps?new_app=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="settings-slack-connect settings-slack-connect-primary"
                >
                  Create New Slack App
                </a>
              </div>
            </div>

            <div className="settings-slack-step-section">
              <p>
                <strong>2.</strong> Fill in the app details:
              </p>
              <ul>
                <li>
                  App Name: <strong>OpsSentinal</strong> (or any name you prefer)
                </li>
                <li>Pick Workspace: Select your Slack workspace</li>
                <li>
                  Click <strong>&quot;Create App&quot;</strong>
                </li>
              </ul>
            </div>

            <div className="settings-slack-step-note">
              <strong>Tip:</strong> Keep the Slack API tab open - you&apos;ll need it in the next
              step!
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="settings-primary-button settings-slack-full"
          >
            I&apos;ve Created the App &rarr; Next Step
          </button>
        </div>
      )}

      {/* Step 2: Configure OAuth */}
      {step === 2 && (
        <div className="settings-slack-step-card">
          <h3>Step 2: Configure OAuth &amp; Get Credentials</h3>

          <div className="settings-form-grid">
            <div className="settings-slack-step-section">
              <h4>2a. Configure OAuth &amp; Permissions</h4>
              <ol>
                <li>
                  In your Slack app, click <strong>&quot;OAuth &amp; Permissions&quot;</strong> in
                  the left sidebar
                </li>
                <li>
                  Scroll to <strong>&quot;Redirect URLs&quot;</strong> section
                </li>
                <li>
                  Click <strong>&quot;Add New Redirect URL&quot;</strong>
                </li>
                <li>
                  Paste this URL and click <strong>&quot;Add&quot;</strong>:
                </li>
              </ol>
              <div className="settings-slack-code">
                {redirectUri}
                <button
                  onClick={handleCopyRedirectUri}
                  className="settings-slack-copy"
                  type="button"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="settings-slack-step-section">
              <h4>2b. Add Bot Token Scopes</h4>
              <p>
                Scroll to <strong>&quot;Scopes&quot;</strong> &rarr;{' '}
                <strong>&quot;Bot Token Scopes&quot;</strong> and add these:
              </p>
              <div className="settings-slack-scopes">
                {['chat:write', 'channels:read', 'channels:join', 'groups:read'].map(scope => (
                  <code key={scope} className="settings-slack-scope">
                    {scope}
                  </code>
                ))}
              </div>
              <p className="settings-muted">
                Add all scopes above. <strong>groups:read</strong> is required for private channels.
              </p>
            </div>

            <div className="settings-slack-credential">
              <h4>2c. Copy Your Credentials</h4>
              <p>
                Still on the <strong>&quot;OAuth &amp; Permissions&quot;</strong> page, find these
                at the top:
              </p>

              <div className="settings-form-grid">
                <div>
                  <label>Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="Paste Client ID here"
                  />
                  <p>Found at the top of OAuth &amp; Permissions page</p>
                </div>

                <div>
                  <label>Client Secret</label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    placeholder="Paste Client Secret here"
                  />
                  <p>
                    In your Slack app settings, click &quot;Show&quot; next to Client Secret, then
                    copy and paste it here.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-slack-step-actions">
            <button onClick={() => setStep(1)} className="settings-link-button" type="button">
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={!clientId || !clientSecret || isSaving}
              className="settings-primary-button"
              type="button"
            >
              {isSaving ? 'Saving...' : 'Save & Continue ->'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Connect */}
      {step === 3 && (
        <div className="settings-slack-step-card settings-slack-success">
          <div className="settings-slack-icon success" aria-hidden="true">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3>Configuration Saved!</h3>
          <p className="settings-muted">
            Now connect your Slack workspace to start receiving notifications
          </p>
          <a href="/api/slack/oauth" className="settings-slack-connect">
            Connect to Slack
          </a>
        </div>
      )}
    </div>
  );
}
