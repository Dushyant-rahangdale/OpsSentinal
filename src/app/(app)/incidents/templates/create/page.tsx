import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import TemplateCreateForm from '@/components/incident/TemplateCreateForm';
import { createTemplateAction } from '../../template-actions';

export default async function CreateTemplatePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const permissions = await getUserPermissions();
  const canManageTemplates = permissions.isResponderOrAbove;

  if (!canManageTemplates) {
    redirect('/incidents/templates');
  }

  const services = await prisma.service.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  const resolvedSearchParams = await searchParams;
  const errorCode = resolvedSearchParams?.error;

  return (
    <main className="container max-w-4xl mx-auto py-8 [zoom:0.9]">
      <Link
        href="/incidents/templates"
        className="inline-flex items-center text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
      >
        ← Back to Templates
      </Link>

      {errorCode === 'duplicate-template' && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 mb-6 text-destructive text-sm font-medium">
          An incident template with this name already exists. Please choose a unique name.
        </div>
      )}

      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Create Incident Template
        </h1>
        <p className="text-muted-foreground">
          Create a reusable template for common incident types to speed up reporting.
        </p>
      </div>

      <TemplateCreateForm services={services} action={createTemplateAction} />
    </main>
  );
}
