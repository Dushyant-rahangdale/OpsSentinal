import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import BootstrapSetupForm from '@/components/BootstrapSetupForm';
import { logger } from '@/lib/logger';
import { AuthLayout, AuthCard } from '@/components/auth/AuthLayout';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { ensureBootstrapAuthorization } from '@/lib/bootstrap-security';

export const dynamic = 'force-dynamic';

const isNextRedirectError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
};

export default async function SetupPage() {
  const requestId = (await headers()).get('x-request-id') || 'unavailable';
  let bootstrapExpiresAt: Date;

  try {
    if ((await prisma.user.count()) > 0) redirect('/login');
    ({ expiresAt: bootstrapExpiresAt } = await ensureBootstrapAuthorization());
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    logger.error('[Setup Page] Database/setup initialization error', {
      component: 'setup-page',
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return (
      <AuthLayout showAnimation={false}>
        <AuthCard>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-['Space_Grotesk',sans-serif] text-2xl font-bold text-slate-950 dark:text-white">
              Setup unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              OpsKnight could not initialize the setup service. Check the server logs and database connectivity.
            </p>
            <p className="mt-4 font-mono text-xs text-slate-400">Reference: {requestId}</p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showAnimation={false}>
      <AuthCard>
        <div className="mb-7 text-center">
          <h1 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-slate-950 dark:text-white">System initialization</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Create the first administrator using the one-time operator authorization capability.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/20 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            <p className="font-semibold">Operator authorization required</p>
            <p className="mt-1">
              The setup code was written once to the OpsKnight server log and expires at{' '}
              {bootstrapExpiresAt.toISOString()}. The raw code is never stored in the database or rendered by this page.
            </p>
          </div>
        </div>

        <BootstrapSetupForm />
      </AuthCard>
    </AuthLayout>
  );
}
