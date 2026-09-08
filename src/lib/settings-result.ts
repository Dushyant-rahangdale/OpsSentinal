'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveJiraConfig } from '@/app/(app)/settings/integrations/jira/actions';
import type { SettingsActionState } from '@/lib/settings-result';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Badge } from '@/components/ui/shadcn/badge';
import { Switch } from '@/components/ui/shadcn/switch';
import { JiraLogo } from '@/components/common/BrandLogos';
import { errorFromResponse } from '@/lib/client-error';
import { toUserFacingError } from '@/lib/user-facing-error';
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

type JiraConfigView = {
  baseUrl: string;
  userEmail: string;
  enabled: boolean;
  webhookSecretEncrypted: string | null;
  updatedAt: Date;
  updatedByUser?: {
    name: string | null;
    email: string;
  } | null;
} | null;

function displayError(error: unknown): string {
  const friendly = toUserFacingError(error, 'Jira connection failed.');
  return friendly.description || friendly.title;
}

function SubmitButton({ disabled, isDirty }: { disabled: boolean; isDirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending || !isDirty} size="sm" className="gap-1.5">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      {pending ? 'Saving Configuration...' : 'Save Changes'}
    </Button>
  );
}

function createSecureWebhookSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const encoded = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `jk_${encoded}`;
}

export default function JiraIntegrationPage({
  config,
  isAdmin,
  appUrl,
}: {
  config: JiraConfigView;
  isAdmin: boolean;
  appUrl?: string;
}) {
  const [state, formAction] = useActionState<SettingsActionState, FormData>(saveJiraConfig, {
    error: null,
    success: false,
    updatedAt: config?.updatedAt ? new Date(config.updatedAt).toISOString() : null,
  });
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? '');
  const [userEmail, setUserEmail] = useState(config?.userEmail ?? '');
  const [apiToken, setApiToken] = useState(config ? '********' : '');
  const [webhookSecret, setWebhookSecret] = useState(
    config?.webhookSecretEncrypted ? '********' : ''
  );
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [showApiToken, setShowApiToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<'cloud' | 'base' | null>(null);

  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const effectiveAppUrl =
    appUrl && appUrl !== 'http://localhost:3000'
      ? appUrl.replace(/\/+$/, '')
      : browserOrigin.replace(/\/+$/, '');
  const webhookUrl = effectiveAppUrl ? `${effectiveAppUrl}/api/jira/webhook` : '/api/jira/webhook';
  const cloudWebhookUrl =
    webhookSecret && webhookSecret !== '********'
      ? `${webhookUrl}?secret=${encodeURIComponent(webhookSecret)}`
      : `${webhookUrl}?secret=YOUR_WEBHOOK_SECRET`;

  const isDirty = useMemo(() => {
    if (!config) {
      return Boolean(
        baseUrl.trim() ||
          userEmail.trim() ||
          apiToken.trim() ||
          webhookSecret.trim() ||
          !enabled
      );
    }
    return (
      baseUrl !== config.baseUrl ||
      userEmail !== config.userEmail ||
      (apiToken !== '********' && apiToken !== '') ||
      (webhookSecret !== '********' &&
        webhookSecret !== (config.webhookSecretEncrypted ? '********' : '')) ||
      enabled !== config.enabled
    );
  }, [config, baseUrl, userEmail, apiToken, webhookSecret, enabled]);

  const resetForm = () => {
    setBaseUrl(config?.baseUrl ?? '');
    setUserEmail(config?.userEmail ?? '');
    setApiToken(config ? '********' : '');
    setWebhookSecret(config?.webhookSecretEncrypted ? '********' : '');
    setEnabled(config?.enabled ?? true);
    setTestResult(null);
  };

  const copyValue = async (value: string, target: 'cloud' | 'base') => {
    await navigator.clipboard.writeText(value);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestLatency(null);
    const start = performance.now();
    try {
      const response = await fetch('/api/jira/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, userEmail, apiToken }),
      });
      setTestLatency(Math.round(performance.now() - start));
      if (!response.ok) throw await errorFromResponse(response, 'Jira connection failed.');
      const data = await response.json();
      setTestResult({
        ok: true,
        message: data.displayName
          ? `Authenticated successfully as ${data.displayName} (${data.emailAddress || userEmail})`
          : 'Connected to Jira successfully.',
      });
    } catch (error) {
      setTestResult({ ok: false, message: displayError(error) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {state?.code === 'SETTINGS_CHANGED' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100 flex items-start justify-between gap-4" role="alert" aria-live="assertive">
          <div className="flex gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Settings changed elsewhere</p>
              <p>{state.error}</p>
              <p className="text-xs mt-1 opacity-80">Your unsaved Jira edits are preserved until you choose to reload.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()} className="shrink-0 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Reload latest
          </Button>
        </div>
      )}
      {state?.error && state.code !== 'SETTINGS_CHANGED' && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex gap-2" role="alert">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div><p className="font-semibold">Configuration Error</p><p>{state.error}</p></div>
        </div>
      )}
      {state?.success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm flex gap-2" role="status" aria-live="polite">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
          <div><p className="font-semibold">Configuration Saved</p><p>Jira settings and encrypted credentials were committed successfully.</p></div>
        </div>
      )}

      <section className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <JiraLogo className="h-6 w-6" />
            <div>
              <h3 className="text-base font-semibold">Workspace Credentials</h3>
              <p className="text-xs text-muted-foreground">Credentials used for Jira issue workflows.</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />AES-256 Encrypted</Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Jira Site URL</Label>
            <Input id="baseUrl" name="baseUrl" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://acme.atlassian.net" required disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userEmail" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Service Account Email</Label>
            <Input id="userEmail" name="userEmail" type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="jira-service-account@company.com" required disabled={!isAdmin} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="apiToken" className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />Atlassian API Token</Label>
            <div className="relative">
              <Input id="apiToken" name="apiToken" type={showApiToken ? 'text' : 'password'} value={apiToken} onChange={e => setApiToken(e.target.value)} required={!config} disabled={!isAdmin} className="pr-10" />
              <button type="button" onClick={() => setShowApiToken(v => !v)} aria-label={showApiToken ? 'Hide API token' : 'Show API token'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showApiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between gap-4">
          <div><Label htmlFor="jira-enabled-switch">Enable Jira Integration Workflows</Label><p className="text-xs text-muted-foreground">Allow incident and postmortem Jira workflows.</p></div>
          <Switch id="jira-enabled-switch" checked={enabled} onCheckedChange={setEnabled} disabled={!isAdmin} />
          <input type="hidden" name="enabled" value={enabled ? 'on' : 'off'} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm space-y-5">
        <div><h3 className="text-base font-semibold">Inbound Webhook Sync</h3><p className="text-xs text-muted-foreground">Authenticate Jira status updates back into OpsKnight.</p></div>
        <div className="space-y-2">
          <Label>Jira Cloud Webhook URL</Label>
          <div className="flex gap-2"><Input value={cloudWebhookUrl} readOnly className="font-mono text-xs" /><Button type="button" variant="outline" onClick={() => copyValue(cloudWebhookUrl, 'cloud')}><Copy className="h-4 w-4" />{copied === 'cloud' ? 'Copied' : 'Copy Jira Cloud URL'}</Button></div>
        </div>
        <div className="space-y-2">
          <Label>OpsKnight Webhook Endpoint</Label>
          <div className="flex gap-2"><Input value={webhookUrl} readOnly className="font-mono text-xs" /><Button type="button" variant="outline" onClick={() => copyValue(webhookUrl, 'base')}><Copy className="h-4 w-4" />{copied === 'base' ? 'Copied' : 'Copy URL'}</Button></div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="webhookSecret">Webhook Secret Token (Optional)</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setWebhookSecret(createSecureWebhookSecret()); setShowWebhookSecret(true); }} disabled={!isAdmin} className="gap-1"><Sparkles className="h-3.5 w-3.5" />Generate Random Secret</Button>
          </div>
          <div className="relative">
            <Input id="webhookSecret" name="webhookSecret" type={showWebhookSecret ? 'text' : 'password'} value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} disabled={!isAdmin} className="pr-10 font-mono" />
            <button type="button" onClick={() => setShowWebhookSecret(v => !v)} aria-label={showWebhookSecret ? 'Hide webhook secret' : 'Show webhook secret'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Generated secrets use the browser cryptographic random-number generator. Save before using the generated URL in Jira.</p>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-base font-semibold flex items-center gap-2"><PlugZap className="h-4 w-4" />Connection Diagnostics</h3><p className="text-xs text-muted-foreground">Tests the exact credentials currently visible above without persisting them.</p></div>
          <Button type="button" variant="outline" size="sm" disabled={testing || !baseUrl.trim() || !userEmail.trim() || !apiToken.trim()} onClick={testConnection} className="gap-1.5">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{testing ? 'Pinging Jira...' : 'Test Connection'}
          </Button>
        </div>
        {testResult && (
          <div className={`rounded-lg border p-4 text-sm flex gap-2 ${testResult.ok ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-destructive/30 bg-destructive/10'}`}>
            {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <div><p className="font-semibold">{testResult.ok ? 'Connection Verified' : 'Connection Failed'}{testLatency !== null ? ` · ${testLatency} ms` : ''}</p><p>{testResult.message}</p></div>
          </div>
        )}
      </section>

      <div className="sticky bottom-4 z-10 bg-card/95 backdrop-blur-md shadow-lg border rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {isDirty && <Badge variant="outline" className="mr-2">Unsaved Changes</Badge>}
          {config ? `Last modified by ${config.updatedByUser?.name || 'Administrator'} on ${new Date(config.updatedAt).toLocaleDateString()}` : 'Configure Atlassian Jira credentials to enable integration.'}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetForm} disabled={!isAdmin || !isDirty}>Discard</Button>
          <SubmitButton disabled={!isAdmin || state?.code === 'SETTINGS_CHANGED'} isDirty={isDirty} />
        </div>
      </div>
    </form>
  );
}
