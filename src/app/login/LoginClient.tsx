'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';
import SsoButton from '@/components/auth/SsoButton';
import LoginAnimation from '@/components/auth/LoginAnimation';
import LoginTicker from '@/components/auth/LoginTicker';

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
  const [rememberMe, setRememberMe] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

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
        rememberMe: String(rememberMe),
        callbackUrl,
      });

      if (result?.error) {
        setError(formatError(result.error));
        setIsSubmitting(false);
        // Trigger shake animation
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      } else if (result?.ok) {
        setIsSubmitting(false);
        setIsSuccess(true);
        setTimeout(() => {
          router.push(result?.url || callbackUrl);
        }, 1200);
      }
    } catch {
      setError('Unexpected error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] lg:h-[100dvh] w-full overflow-hidden bg-background text-primary-foreground font-sans selection:bg-primary/20">
      {/* Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,255,255,0.1),transparent_25%),radial-gradient(circle_at_85%_30%,rgba(255,255,255,0.05),transparent_25%)] mix-blend-overlay" />

      {/* Main Container */}
      <div className="relative mx-auto flex min-h-[100dvh] lg:h-full w-full max-w-[1920px] flex-col px-6 py-6 sm:px-12 lg:px-16 xl:px-24 overflow-hidden">
        {/* Header - Enhanced Branding */}
        <header className="flex items-center justify-between gap-4 py-1 mb-2 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/30 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-sm group transition-all duration-500 hover:border-emerald-500/60 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]">
              <img
                src="/logo.svg"
                alt="OpsSentinal"
                className="h-7 w-7 opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.2em] text-white">OpsSentinal</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/20 px-4 py-2 rounded-full border border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            System Operational
          </div>
        </header>

        {/* Content Body */}
        <main className="grid flex-1 items-center gap-12 lg:grid-cols-2 lg:gap-24 xl:gap-32 pb-20">
          {/* Left Side: Animated Hero */}
          <section className="hidden lg:flex h-full w-full items-center justify-center min-h-[500px] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-transparent blur-3xl -z-10 opacity-30" />
            <LoginAnimation />
          </section>

          {/* Right Side: Login Card */}
          <section className="flex justify-center w-full lg:justify-end">
            <div className="relative w-full max-w-[480px]">
              {/* Card Backlight Effect */}
              <div
                className={`absolute -inset-[2px] rounded-[20px] bg-gradient-to-b from-white/10 to-transparent blur-xl opacity-30 transition-all duration-1000 ${isSuccess ? 'from-emerald-500 opacity-50 blur-2xl' : ''}`}
              />

              <div
                className={`relative overflow-hidden rounded-2xl border bg-[#0a0a0a]/80 p-8 shadow-2xl backdrop-blur-xl transition-all duration-500 ${isSuccess ? 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'border-white/10'}`}
              >
                {/* Card Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    {isSuccess ? (
                      <span className="text-emerald-400 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Access Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <img src="/logo.svg" alt="OpsSentinal" className="h-6 w-6 opacity-90" />
                        <span className="text-white">OpsSentinal Console</span>
                      </span>
                    )}
                  </h2>
                  <p className="mt-2 text-sm text-white/50">
                    {isSuccess ? 'Initializing secure session...' : 'Identify yourself to proceed.'}
                  </p>
                </div>

                {/* Notifications */}
                {passwordSet && (
                  <div className="mb-6 rounded bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Password updated successfully.
                  </div>
                )}

                {(error || ssoError) && (
                  <div className="mb-6 rounded bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-200">
                    {error || ssoError}
                  </div>
                )}

                {/* SSO Section */}
                {ssoEnabled && (
                  <div
                    className={`space-y-6 mb-8 transition-opacity duration-300 ${isSuccess ? 'opacity-30 pointer-events-none' : ''}`}
                  >
                    <SsoButton
                      providerType={ssoProviderType as any}
                      providerLabel={ssoProviderLabel}
                      onClick={handleSSO}
                      loading={isSSOLoading}
                      disabled={isSubmitting || isSSOLoading || isSuccess}
                    />
                    <div className="relative flex items-center gap-4">
                      <div className="flex-1 border-t border-white/10" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Or
                      </span>
                      <div className="flex-1 border-t border-white/10" />
                    </div>
                  </div>
                )}

                {/* Maintain alignment with previous content flow */}

                {/* Credentials Form */}
                <form
                  onSubmit={handleCredentials}
                  className={`space-y-5 transition-all duration-300 ${isSuccess ? 'opacity-50 pointer-events-none' : ''} ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
                  noValidate
                >
                  <fieldset disabled={isSuccess} className="space-y-5">
                    <div className="group space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 ml-1 group-focus-within:text-white/80 transition-colors">
                        Email Address
                      </label>
                      <div className="flex rounded border border-white/10 bg-white/5 overflow-hidden transition-all focus-within:border-white/30 focus-within:bg-white/10 hover:bg-white/10">
                        <div className="flex items-center justify-center w-12 border-r border-white/10 bg-white/5">
                          <svg
                            className="h-4 w-4 text-white/40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="flex-1 bg-transparent px-4 py-3 text-sm font-mono text-white/80 placeholder-white/30 outline-none"
                          placeholder="you@opssentinal.com"
                          required
                          disabled={isSubmitting || isSSOLoading}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="group space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-focus-within:text-white/80 transition-colors">
                          Password
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-[10px] text-white/50 hover:text-white/80 transition"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="flex rounded border border-white/10 bg-white/5 overflow-hidden transition-all focus-within:border-white/30 focus-within:bg-white/10 hover:bg-white/10">
                        <div className="flex items-center justify-center w-12 border-r border-white/10 bg-white/5">
                          <svg
                            className="h-4 w-4 text-white/40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onKeyDown={e => setCapsLockOn(e.getModifierState('CapsLock'))}
                          onKeyUp={e => setCapsLockOn(e.getModifierState('CapsLock'))}
                          className="flex-1 bg-transparent px-4 py-3 text-sm font-mono text-white/80 placeholder-white/30 outline-none"
                          placeholder="••••••••"
                          required
                          disabled={isSubmitting || isSSOLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="flex items-center justify-center w-12 border-l border-white/10 text-white/40 hover:text-white transition"
                        >
                          {showPassword ? (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.01 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.01-9.963-7.178z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Caps Lock Warning */}
                      {capsLockOn && (
                        <div className="flex items-center gap-2 mt-2 text-amber-400 text-xs">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <span>Caps Lock is on</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="remember-me"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/40 focus:ring-offset-0"
                      />
                      <label
                        htmlFor="remember-me"
                        className="text-xs text-white/60 select-none cursor-pointer hover:text-white transition"
                      >
                        Remember me
                      </label>
                    </div>
                  </fieldset>

                  <button
                    type="submit"
                    disabled={isSubmitting || isSSOLoading || !isValid || isSuccess}
                    className={`relative w-full overflow-hidden rounded-lg py-3.5 text-sm font-bold shadow-lg transition-all duration-300
                        ${
                          isSuccess
                            ? 'bg-emerald-500 text-white scale-[1.02] shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                            : 'bg-white text-black hover:bg-white/95 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg'
                        }
                    `}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-wide">
                      {isSuccess ? (
                        <>
                          <span>Authorized</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </>
                      ) : isSubmitting ? (
                        <>
                          <Spinner size="sm" variant="black" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.15em] text-white/40 mt-8 font-medium">
                    <svg
                      className="h-3.5 w-3.5 text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>Secured with TLS 1.3</span>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </main>

        {/* Footer Ticker */}
        <LoginTicker />
      </div>
    </div>
  );
}
