import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getUserPermissions } from '@/lib/rbac';
import { deleteTemplate, getAllTemplates } from '../template-actions';
import { revalidatePath } from 'next/cache';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

export const revalidate = 30;

export default async function TemplatesPage() {
  const permissions = await getUserPermissions();
  const canManageTemplates = permissions.isResponderOrAbove;

  const templates = await getAllTemplates(permissions.id);

  // Get user timezone for date formatting
  const session = await getServerSession(await getAuthOptions());
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { timeZone: true },
      })
    : null;
  const userTimeZone = getUserTimeZone(user ?? undefined);

  async function handleDelete(formData: FormData) {
    'use server';
    const templateId = formData.get('templateId') as string;
    try {
      await deleteTemplate(templateId);
      revalidatePath('/incidents/templates');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete template');
    }
  }

  return (
    <main>
      <header
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.5rem',
        }}
      >
        <div style={{ flex: 1 }}>
          <Link
            href="/incidents"
            style={{
              color: 'var(--text-muted)',
              marginBottom: '0.5rem',
              display: 'inline-block',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            ← Back to Incidents
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.35rem' }}>
            Incident Templates
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Pre-configured templates for common incident types. Create incidents faster with
            templates.
          </p>
        </div>
        {canManageTemplates && (
          <Link
            href="/incidents/templates/create"
            className="glass-button primary"
            style={{ textDecoration: 'none', borderRadius: '0px', whiteSpace: 'nowrap' }}
          >
            + Create Template
          </Link>
        )}
      </header>

      {templates.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: '#f9fafb',
            border: '1px solid var(--border)',
            borderRadius: '0px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
            }}
          >
            No Templates Yet
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Create your first incident template to speed up incident creation.
          </p>
          {canManageTemplates && (
            <Link
              href="/incidents/templates/create"
              className="glass-button primary"
              style={{ textDecoration: 'none', borderRadius: '0px' }}
            >
              Create Your First Template
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {templates.map(template => (
            <div
              key={template.id}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid var(--border)',
                borderRadius: '0px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {template.name}
                  </h3>
                  {template.description && (
                    <p
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.75rem',
                      }}
                    >
                      {template.description}
                    </p>
                  )}
                </div>
                {template.isPublic ? (
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#eaf7ef',
                      color: '#16a34a',
                      border: '1px solid #a7f3d0',
                      borderRadius: '0px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Public
                  </span>
                ) : (
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#f3f4f6',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Private
                  </span>
                )}
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  background: '#f9fafb',
                  border: '1px solid var(--border)',
                  borderRadius: '0px',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>Title:</strong>{' '}
                  <span style={{ color: 'var(--text-primary)' }}>{template.title}</span>
                </div>
                {template.descriptionText && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: 'var(--text-muted)' }}>Description:</strong>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{template.descriptionText}</span>
                  </div>
                )}
                <div
                  style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Urgency:</strong>{' '}
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        background: template.defaultUrgency === 'HIGH' ? '#feecec' : '#fff4cc',
                        color: template.defaultUrgency === 'HIGH' ? '#dc2626' : '#b45309',
                        borderRadius: '0px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {template.defaultUrgency}
                    </span>
                  </div>
                  {template.defaultPriority && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Priority:</strong>{' '}
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          borderRadius: '0px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {template.defaultPriority}
                      </span>
                    </div>
                  )}
                  {template.defaultService && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Service:</strong>{' '}
                      <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                        {template.defaultService.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <Link
                  href={`/incidents/create?template=${template.id}`}
                  className="glass-button"
                  style={{
                    flex: 1,
                    textDecoration: 'none',
                    borderRadius: '0px',
                    background: 'var(--primary-color)',
                    color: 'white',
                    textAlign: 'center',
                    padding: '0.625rem 1rem',
                    fontWeight: 600,
                  }}
                >
                  Use Template
                </Link>
                {canManageTemplates && template.createdById === permissions.id && (
                  <form action={handleDelete} style={{ display: 'inline' }}>
                    <input type="hidden" name="templateId" value={template.id} />
                    <ConfirmSubmitButton
                      confirmMessage="Are you sure you want to delete this template?"
                      className="glass-button"
                      style={{
                        padding: '0.625rem 1rem',
                        background: '#feecec',
                        color: '#dc2626',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: '0px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                )}
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Created by {template.createdBy.name}</span>
                <span>{formatDateTime(template.createdAt, userTimeZone, { format: 'date' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
