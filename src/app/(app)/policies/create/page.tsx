import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/lib/rbac';
import PolicyForm from '@/components/policies/PolicyForm';
import { Button } from '@/components/ui/shadcn/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Create Escalation Policy | OpsSentinel',
};

export default async function CreatePolicyPage() {
  const permissions = await getUserPermissions();

  if (!permissions.isAdmin) {
    redirect('/policies');
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6 [zoom:0.8]">
      <div>
        <Link href="/policies">
          <Button
            variant="ghost"
            size="sm"
            className="pl-0 text-slate-500 mb-4 hover:text-slate-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Policies
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create Escalation Policy
        </h1>
        <p className="text-slate-500 mt-1">Set up a new policy to manage incident notifications.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <PolicyForm />
      </div>
    </div>
  );
}
