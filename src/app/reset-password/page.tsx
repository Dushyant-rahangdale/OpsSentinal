'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Spinner from '@/components/ui/Spinner';
import { Eye, EyeOff, Lock, AlertTriangle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { AuthLayout, AuthCard } from '@/components/auth/AuthLayout';
import { cn } from '@/lib/utils';
import { calculatePasswordStrength } from '@/lib/password-strength';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password strength using centralized utility
  const passwordStrength = calculatePasswordStrength(password);
  const isStrong = passwordStrength.meetsMinimum && passwordStrength.score >= 4;

  if (!token) {
    return (
      <div className="p-4 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-sm flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-red-700 dark:text-rose-400">Invalid token</p>
          <p className="text-red-600 dark:text-red-300/80 text-xs mt-0.5">
            Invalid or missing reset token. Please request a new link.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isStrong) {
      setError('Please create a stronger password');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
      } else {
        setSuccess(true);

        // Clear all NextAuth session cookies to prevent token version mismatch
        // This ensures no stale session interferes with fresh login
        document.cookie = 'next-auth.session-token=; Max-Age=0; path=/; SameSite=Lax';
        document.cookie =
          '__Secure-next-auth.session-token=; Max-Age=0; path=/; Secure; SameSite=Lax';
        document.cookie = 'next-auth.csrf-token=; Max-Age=0; path=/; SameSite=Lax';
        document.cookie = '__Host-next-auth.csrf-token=; Max-Age=0; path=/; Secure; SameSite=Lax';

        // Redirect after success
        setTimeout(() => {
          router.push('/login?password=1');
        }, 2000);
      }
    } catch (_err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col items-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
              Password updated
            </h3>
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-200/80">
              Your password has been successfully reset. Redirecting to sign in…
            </p>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse">
          Redirecting…
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Error banner */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-700 dark:text-rose-400">Reset failed</p>
            <p className="text-red-600 dark:text-red-300/80 text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-red-600 dark:text-rose-400/60 dark:hover:text-rose-300 transition"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
          >
            New password
          </label>
          <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-slate-400 dark:focus-within:border-slate-500 transition-colors">
            <div className="flex items-center justify-center pl-3.5 pr-2.5">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-transparent px-2 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              placeholder="Strong new password"
              autoComplete="new-password"
              disabled={isSubmitting}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Strength indicator */}
          {password && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex gap-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                {[1, 2, 3, 4, 5].map(level => (
                  <div
                    key={level}
                    className={cn(
                      'h-full flex-1 rounded-full transition-all duration-500',
                      level <= (passwordStrength.score + 1) * 1.25
                        ? passwordStrength.color
                        : 'bg-transparent'
                    )}
                  />
                ))}
              </div>
              <p className={cn('text-[10px] font-medium text-right', passwordStrength.textColor)}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
          >
            Confirm password
          </label>
          <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-slate-400 dark:focus-within:border-slate-500 transition-colors">
            <div className="flex items-center justify-center pl-3.5 pr-2.5">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-transparent px-2 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              placeholder="Confirm new password"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {confirmPassword && password !== confirmPassword && (
            <p className="text-[10px] text-red-500 dark:text-rose-400 font-medium flex items-center gap-1 animate-in slide-in-from-top-1">
              <X className="h-3 w-3" />
              Passwords do not match
            </p>
          )}
          {confirmPassword && password === confirmPassword && password.length > 0 && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in slide-in-from-top-1">
              <CheckCircle2 className="h-3 w-3" />
              Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isStrong || password !== confirmPassword}
          className={cn(
            'mt-1 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1',
            'bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" variant="white" />
              <span>Updating…</span>
            </>
          ) : (
            <>
              <span>Set new password</span>
              <ShieldCheck className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard>
        {/* Brand + heading */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="h-8 w-8 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 flex items-center justify-center p-1">
              <Image
                src="/logo.png"
                alt="OpsKnight"
                width={28}
                height={28}
                className="h-6 w-6 object-contain"
              />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              OpsKnight
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Reset password
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Secure your account with a strong new password.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center p-8">
              <Spinner variant="default" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <Lock className="h-3 w-3" />
          <span>Your instance. Your data. Your rules.</span>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
