'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Spinner from '@/components/ui/Spinner';
import { AuthLayout, AuthCard } from '@/components/auth/AuthLayout';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsSent(true);
        setMessage(data.message);
      } else {
        setError(data.message || 'Something went wrong.');
      }
    } catch (_err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout isSuccess={isSent}>
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
            {isSent ? 'Check your email' : 'Account recovery'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {isSent
              ? 'Reset instructions are on their way.'
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {isSent ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Success card */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col items-center text-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-200/80 leading-relaxed max-w-xs">
                {message}
              </p>
            </div>

            <Link
              href="/login"
              className="group w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {/* Error banner */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-700 dark:text-rose-400">Request failed</p>
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
              {/* Email field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Email address
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-slate-400 dark:focus-within:border-slate-500 transition-colors">
                  <div className="flex items-center justify-center pl-3.5 pr-2.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full bg-transparent px-2 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1',
                    'bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" variant="white" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <span>Send reset link</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to sign in
                  </Link>
                </div>
              </div>
            </form>

            <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
              No email? Contact your administrator.
            </p>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <Lock className="h-3 w-3" />
          <span>Your instance. Your data. Your rules.</span>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
