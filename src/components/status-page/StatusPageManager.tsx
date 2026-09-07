'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function StatusPageManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/status-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.get('name'), slug: form.get('slug') }),
      });
      const payload = (await response.json()) as {
        data?: { page?: { id: string } };
        error?: string;
      };
      const page = payload.data?.page;
      if (!response.ok || !page) throw new Error(payload.error || 'Unable to create page.');
      router.push(`/settings/status-pages/${encodeURIComponent(page.id)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create page.');
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm font-semibold"
        onClick={() => setOpen(true)}
      >
        Create status page
      </button>
    );
  }
  return (
    <form onSubmit={createPage} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <p className="w-full text-sm text-gray-600">
        {step === 0
          ? 'Name this communication page and choose its URL.'
          : 'Your page will be created as a draft. Choose its audience, map services, and review branding before enabling it.'}
      </p>
      <label className="text-sm">
        Name
        <input name="name" required maxLength={200} className="ml-2 rounded border px-2 py-1" />
      </label>
      <label className="text-sm">
        Slug
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          maxLength={80}
          className="ml-2 rounded border px-2 py-1"
        />
      </label>
      <button
        type={step === 0 ? 'button' : 'submit'}
        onClick={
          step === 0
            ? event => {
                if (event.currentTarget.form?.reportValidity()) setStep(1);
              }
            : undefined
        }
        disabled={pending}
        className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Creating…' : step === 0 ? 'Review draft' : 'Create draft'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded border px-3 py-2 text-sm"
      >
        Cancel
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
