import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import BootstrapSetupForm from '@/components/BootstrapSetupForm';
import { logger } from '@/lib/logger';
import { AuthLayout, AuthCard } from '@/components/auth/AuthLayout';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

const isNextRedirectError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
};

export default async function SetupPage() {
  try {
    const totalUsers = await prisma.user.count();
    if (totalUsers > 0) {
      redirect('/login');
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    logger.error('[Setup Page] Database error', { component: 'setup-page', error });

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('connect') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('P1001')
    ) {
      return (
        <AuthLayout showAnimation={false}>
          <AuthCard>
            {/* Brand header */}
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

              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-red-500">
                    Connection Error
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                    Database unavailable
                  </h1>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Unable to connect to the database. Please ensure:
            </p>

            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-5">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                The database server is running
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <code className="text-xs">DATABASE_URL</code> is correctly configured
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>
                  If using Docker Compose, run:{' '}
                  <code className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    docker-compose up -d OpsKnight-db
                  </code>
                </span>
              </li>
            </ul>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Error details
              </p>
              <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                {errorMessage}
              </p>
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

    throw error;
  }

  return (
    <AuthLayout showAnimation={false}>
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
            System initialization
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Create the first admin account to start your incident command surface.
          </p>
        </div>

        {/* Security notice */}
        <div className="mb-6 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">Security notice</p>
            <p className="text-amber-600 dark:text-amber-200/70 text-xs mt-0.5">
              Change this password immediately after your first sign in.
            </p>
          </div>
        </div>

        <BootstrapSetupForm />

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <Lock className="h-3 w-3" />
          <span>Your instance. Your data. Your rules.</span>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
