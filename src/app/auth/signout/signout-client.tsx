'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { AuthLayout, AuthCard } from '@/components/auth/AuthLayout';
import { LogOut, ArrowLeft, Lock } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { purgeBrowserAuthCaches } from '@/lib/auth-cache-purge';

export default function SignOutClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/login';
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await purgeBrowserAuthCaches();
    await signOut({ callbackUrl });
  };

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
            Sign out?
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to end your secure session?
          </p>
        </div>

        <div className="space-y-3">
          {/* Primary — destructive action */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="relative w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSigningOut ? (
              <>
                <Spinner size="sm" variant="white" />
                <span>Signing out…</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </>
            )}
          </button>

          {/* Secondary — go back */}
          <Link
            href={callbackUrl}
            className="group w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Return to app
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <Lock className="h-3 w-3" />
          <span>Your instance. Your data. Your rules.</span>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
