'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';
import SsoButton from '@/components/auth/SsoButton';

type Props = {
  callbackUrl: string;
  errorCode?: string | null;
  passwordSet?: boolean;
  ssoError?: string | null;
  ssoEnabled: boolean;
  ssoProviderType?: string | null;
  ssoProviderLabel?: string | null;
};

function formatError(message: string | null | undefined) {
  if (!message) return '';
  if (message === 'CredentialsSignin') return 'Invalid credentials';
  if (message === 'AccessDenied') return 'Access denied';
  return 'Authentication failed';
}

export default function LoginClient({
  callbackUrl,
  errorCode,
  passwordSet,
  ssoError,
  ssoEnabled,
  ssoProviderType,
  ssoProviderLabel,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);

  useEffect(() => {
    if (errorCode) setError(formatError(errorCode));
  }, [errorCode]);

  useEffect(() => {
    setIsValid(Boolean(email) && Boolean(password));
  }, [email, password]);

  const handleSSO = async () => {
    setIsSSOLoading(true);
    try {
      await signIn('oidc', { callbackUrl });
    } catch {
      setError('Connection failed');
      setIsSSOLoading(false);
    }
  };

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
        callbackUrl,
      });

      if (result?.error) {
        setError(formatError(result.error));
        setIsSubmitting(false);
      } else if (result?.ok) {
        router.push(result?.url || callbackUrl);
      }
    } catch {
      setError('Unexpected error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(148,163,184,0.18),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(100,116,139,0.16),transparent_30%),radial-gradient(circle_at_42%_78%,rgba(71,85,105,0.14),transparent_32%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] opacity-15" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/92 to-slate-950" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.6),rgba(15,23,42,0.25),rgba(15,23,42,0.6))] opacity-50 mix-blend-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.45),transparent_58%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-5 py-6 sm:py-7 lg:py-9">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 shadow-lg shadow-black/20">
              <img src="/logo.svg" alt="OpsSentinal logo" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                OpsSentinal
              </p>
              <p className="text-sm text-slate-200/80">Incident control surface</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-100">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-pulse-subtle" />
            Systems steady
          </div>
        </header>

        <main className="mt-4 grid flex-1 items-start gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
          <section className="hidden max-w-3xl flex-col gap-4 lg:flex">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200/80 ring-1 ring-white/10 backdrop-blur">
                Open-source incident control
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-[2.1rem] lg:text-[2.2rem]">
                Detect, mobilize, and communicate—without leaving the deck.
              </h1>
              <p className="max-w-xl text-sm text-slate-200/80">
                Self-hosted console for signals, on-call rotations, escalations, and status comms.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/5 p-4 shadow-2xl backdrop-blur">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.22),transparent_42%),radial-gradient(circle_at_78%_12%,rgba(100,116,139,0.18),transparent_38%),radial-gradient(circle_at_30%_78%,rgba(71,85,105,0.16),transparent_36%)]" />
              <div className="absolute inset-4 rounded-2xl border border-white/10" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-50 animate-[shimmer_9s_linear_infinite]" />

              <div className="relative grid gap-3 sm:grid-cols-3">
                <div className="relative flex flex-col gap-2 rounded-2xl bg-white/5 p-3 shadow-inner shadow-black/20">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200/70">
                    <span>Lifecycle</span>
                    <span className="inline-flex items-center gap-1 text-slate-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse-subtle" />
                      Live
                    </span>
                  </div>
                  <div className="space-y-2">
                    {['Detect', 'Triage', 'Mitigate', 'Recover', 'Review'].map((step, idx) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className="absolute inset-y-0 left-0 w-3/4 rounded-full bg-emerald-300/60 animate-[shimmer_2s_ease_infinite]"
                            style={{ animationDelay: `${idx * 120}ms` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-100">
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative flex flex-col gap-2 rounded-2xl bg-white/5 p-3 shadow-inner shadow-black/20">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200/70">
                    <span>On-call</span>
                    <span className="text-slate-100">Rotation</span>
                  </div>
                  <div className="relative mx-auto h-24 w-24">
                    <div className="absolute inset-0 rounded-full border border-white/20" />
                    <div className="absolute inset-2 rounded-full border border-emerald-300/50 animate-[spin_12s_linear_infinite]" />
                    <div className="absolute inset-5 rounded-full border border-slate-300/40 animate-[spin_10s_linear_infinite_reverse]" />
                    <div className="absolute inset-8 flex items-center justify-center rounded-full bg-emerald-400/15 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-50">
                      L1 / L2
                    </div>
                  </div>
                  <p className="text-xs text-slate-200/80">Schedules + escalations stay in sync.</p>
                </div>

                <div className="relative flex flex-col gap-2 rounded-2xl bg-white/5 p-3 shadow-inner shadow-black/20">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200/70">
                    <span>Status & comms</span>
                    <span className="inline-flex items-center gap-1 text-slate-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse-subtle" />
                      Up
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                      Status page broadcast
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-200 shadow-[0_0_10px_rgba(226,232,240,0.5)]" />
                      Slack / Email / SMS alerts
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.5)]" />
                      Audit trail & SSO/OIDC
                    </div>
                  </div>
                  <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="absolute inset-y-0 left-0 w-1/2 animate-[shimmer_1.8s_ease_infinite] bg-gradient-to-r from-white/0 via-white/40 to-white/0" />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                {['Self-hosted', 'OIDC / SSO', 'RBAC & audit', 'Multi-channel alerts'].map(item => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="order-first lg:order-none relative flex items-center justify-center">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-white/5 blur-3xl" />
            <div className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/10 bg-white/95 text-slate-900 shadow-2xl shadow-slate-900/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900" />
              <div className="relative space-y-5 px-6 py-7 sm:px-8 sm:py-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Secure incident login
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                      Sign in to OpsSentinal
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Self-hosted, open-source control for signals, on-call rotations, escalations,
                      status pages, and comms.
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
                    <img src="/logo.svg" alt="OpsSentinal" className="h-6 w-6" />
                  </div>
                </div>

                {passwordSet && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    Password updated. You can sign in with your new credentials.
                  </div>
                )}

                {ssoError && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {ssoError}
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    <svg
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {ssoEnabled && (
                  <div className="space-y-3">
                    <SsoButton
                      providerType={ssoProviderType as any}
                      providerLabel={ssoProviderLabel}
                      onClick={handleSSO}
                      loading={isSSOLoading}
                      disabled={isSubmitting || isSSOLoading}
                    />
                    <div className="relative flex items-center gap-3">
                      <div className="flex-1 border-t border-slate-200" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Or use credentials
                      </span>
                      <div className="flex-1 border-t border-slate-200" />
                    </div>
                  </div>
                )}

                <form onSubmit={handleCredentials} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      Work email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 shadow-inner shadow-slate-200 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      placeholder="name@company.com"
                      autoComplete="email"
                      required
                      disabled={isSubmitting || isSSOLoading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Password
                      </label>
                      <a
                        href="/forgot-password"
                        className="text-xs font-semibold text-slate-700 transition hover:text-slate-900"
                      >
                        Forgot?
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-medium text-slate-900 shadow-inner shadow-slate-200 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                        placeholder="********"
                        autoComplete="current-password"
                        required
                        disabled={isSubmitting || isSSOLoading}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute inset-y-0 right-3 my-auto flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isSSOLoading || !isValid}
                    className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 enabled:hover:-translate-y-[1px] enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition group-hover:animate-[shimmer_1.4s_ease_infinite]" />
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" variant="white" />
                        <span>Signing in</span>
                      </>
                    ) : (
                      <>
                        <span>Enter console</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.3}
                            d="M5 12h14M12 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <span>Audit-ready by default</span>
                  <span>Data stays in your cloud</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
