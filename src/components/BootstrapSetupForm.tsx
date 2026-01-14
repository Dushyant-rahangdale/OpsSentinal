'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { bootstrapAdmin } from '@/app/setup/actions';

type FormState = {
  error?: string | null;
  success?: boolean;
  password?: string | null;
  email?: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 enabled:hover:-translate-y-[1px] enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition group-hover:animate-[shimmer_1.4s_ease_infinite]" />
      {pending ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Creating admin...</span>
        </>
      ) : (
        <>
          <span>Generate Admin Credentials</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  );
}

export default function BootstrapSetupForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      return bootstrapAdmin(formData);
    },
    {
      error: null,
      success: false,
    }
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5" suppressHydrationWarning>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Full name
        </label>
        <input
          name="name"
          required
          placeholder="Alice DevOps"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 shadow-inner shadow-slate-200 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="alice@example.com"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 shadow-inner shadow-slate-200 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <SubmitButton />

      {state?.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && state.password && state.email && (
        <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-4 w-4 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-emerald-800">Admin account created</p>
          </div>
          <p className="text-xs text-emerald-700">
            Store this password safely and rotate it after creating your own admin user.
          </p>
          <div className="space-y-2 rounded-lg bg-white/60 p-3 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email:
              </span>
              <span className="text-slate-800">{state.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password:
              </span>
              <span className="text-slate-800 select-all">{state.password}</span>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
