import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import TemplateCreateForm from '@/components/incident/TemplateCreateForm';
import { createTemplateAction } from '../../template-actions';

export default async function CreateTemplatePage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
    const permissions = await getUserPermissions();
    const canManageTemplates = permissions.isResponderOrAbove;

    if (!canManageTemplates) {
        redirect('/incidents/templates');
    }

    const services = await prisma.service.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });
    const resolvedSearchParams = await searchParams;
    const errorCode = resolvedSearchParams?.error;

    return (
        <main>
            <Link href="/incidents/templates" style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'inline-block', textDecoration: 'none', fontSize: '0.9rem' }}>
                ← Back to Templates
            </Link>

            {errorCode === 'duplicate-template' && (
                <div className="glass-panel" style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '1.5rem',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    borderRadius: '0px'
                }}>
                    An incident template with this name already exists. Please choose a unique name.
                </div>
            )}

            <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', background: '#f9fafb', border: '1px solid var(--border)', borderRadius: '0px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Create Incident Template</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Create a reusable template for common incident types. Templates pre-fill fields when creating incidents.
                </p>

                <TemplateCreateForm services={services} action={createTemplateAction} />
            </div>
        </main>
    );
}
