'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import Spinner from '@/components/ui/Spinner';
import SsoButton from '@/components/auth/SsoButton';
import { AuthLayout, AuthCard } from '@/components/auth/AuthLayout';
import { Mail, Lock, Eye, EyeOff, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { purgeBrowserAuthCaches } from '@/lib/auth-cache-purge';

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
  // NextAuth appends ?error=SessionRequired on unauthenticated redirects — not a real error
  if (message === 'SessionRequired') return '';
  if (message === 'CredentialsSignin') return 'Invalid email or password';
  if (message === 'AccessDenied') return 'Access denied';
  if (message === 'SessionExpired') return 'Your session has expired. Please sign in again.';
  if (message === 'OAuthSignin' || message === 'OAuthCallback')
    return 'SSO authentication failed. Please try again or contact your administrator.';
  if (message === 'Configuration')
    return 'Server configuration error. Please contact your administrator.';
  return 'Authentication failed. Please try again.';
}

export default function LoginClient({
  callbackUrl,
  errorCode,
  passwordSet: _passwordSet,
  ssoError,
  ssoEnabled,
  ssoProviderType,
  ssoProviderLabel,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(() => formatError(errorCode) || ssoError || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  // Email validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (errorCode) setError(formatError(errorCode));
  }, [errorCode]);

  // Surface SSO configuration errors passed from the server component
  useEffect(() => {
    if (ssoError) setError(ssoError);
  }, [ssoError]);

  const handleSSO = async () => {
    setIsSSOLoading(true);
    try {
      await purgeBrowserAuthCaches();
      await signIn('oidc', { callbackUrl });
    } catch {
      setError('Connection failed');
      setIsSSOLoading(false);
    }
  };

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      if (!email) setEmailTouched(true);
      return;
    }

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
        // `result.url` from NextAuth's credentials provider (with
        // redirect:false) is unreliable — depending on the original
        // callbackUrl it can come back pointing at the signin page
        // itself, breaking the post-login navigation. Use the
        // validated `callbackUrl` prop, guarded against /login loop.
        const safeTarget =
          callbackUrl &&
          callbackUrl.startsWith('/') &&
          !callbackUrl.startsWith('/login') &&
          !callbackUrl.includes('/auth/signout')
            ? callbackUrl
            : '/';

        // Purge any stale Service Worker dynamic/RSC caches immediately
        void purgeBrowserAuthCaches();

        // Standard enterprise practice for post-authentication transition:
        // A hard navigation via window.location.assign() completely blows away
        // the client-side RSC router cache and forces a full server document
        // request with the newly issued session cookie.
        setTimeout(() => {
          window.location.assign(safeTarget);
        }, 200);
      }
    } catch {
      setError('Unexpected error');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout isSuccess={isSuccess}>
      <AuthCard isSuccess={isSuccess}>
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <Image
              src="/logo.png"
              alt="OpsKnight"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
              unoptimized
            />
            <span className="font-extrabold text-2xl tracking-tight text-slate-950 dark:text-white">
              OpsKnight
            </span>
          </div>
          <h2 className="text-3xl font-serif text-slate-950 dark:text-white mb-1.5 font-normal tracking-tight">
            {isSuccess ? 'Access Granted' : 'Welcome back'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isSuccess ? 'Redirecting to secure console...' : 'Sign in to your OpsKnight instance.'}
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div
            className={`mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 ${
              isShaking ? 'animate-shake' : ''
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 dark:text-red-200 mb-0.5">
                Authentication Error
              </p>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleCredentials} className="space-y-4">
          {/* Work Email */}
          <div>
            <label
              className={cn(
                'block text-xs font-semibold mb-1.5 transition-colors',
                emailTouched && email && !isEmailValid
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-800 dark:text-slate-200'
              )}
            >
              Work email
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                onBlur={() => setEmailTouched(true)}
                className="auth-input login-input w-full pl-12 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 dark:focus:border-red-500 transition-all shadow-xs"
                placeholder="you@company.com"
                disabled={isSubmitting || isSuccess}
              />
              {emailTouched && email && !isEmailValid && (
                <div className="absolute right-3 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
            </div>
            {emailTouched && email && !isEmailValid && (
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium pl-1 mt-1">
                Please enter a valid email address
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={e => {
                  setCapsLockOn(e.getModifierState('CapsLock'));
                }}
                className="auth-input login-input w-full pl-12 pr-10 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 dark:focus:border-red-500 transition-all shadow-xs"
                placeholder="Enter your password"
                disabled={isSubmitting || isSuccess}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <label
                htmlFor="remember-me"
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  disabled={isSubmitting || isSuccess}
                  className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 bg-transparent text-red-600 focus:ring-red-500/20"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Remember me
                </span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {capsLockOn && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs mt-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Caps Lock is ON</span>
              </div>
            )}
          </div>

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={isSubmitting || isSSOLoading || isSuccess}
            className={cn(
              'w-full py-3 px-4 rounded-lg text-white font-bold text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
              isSuccess
                ? 'bg-emerald-600 shadow-emerald-600/20'
                : 'bg-[#111827] dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 hover:ring-2 hover:ring-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500/30 active:bg-black dark:active:bg-slate-200 shadow-slate-950/10'
            )}
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorized</span>
              </>
            ) : isSubmitting ? (
              <>
                <Spinner size="sm" variant="white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </>
            )}
          </button>

          {/* SSO Section */}
          {ssoEnabled && (
            <>
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <span className="relative px-3 text-xs text-muted-foreground bg-background">
                  or
                </span>
              </div>

              <div>
                <SsoButton
                  providerType={ssoProviderType as 'google' | 'okta' | 'azure' | 'auth0' | 'custom'}
                  providerLabel={ssoProviderLabel}
                  onClick={handleSSO}
                  loading={isSSOLoading}
                  disabled={isSubmitting || isSuccess}
                />
              </div>
            </>
          )}

          {/* Setup Guide Link */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium pt-3">
            Setting up OpsKnight?{' '}
            <Link
              href="/help"
              className="text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:underline font-semibold ml-1 inline-flex items-center gap-1 transition-colors"
            >
              Installation guide →
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
