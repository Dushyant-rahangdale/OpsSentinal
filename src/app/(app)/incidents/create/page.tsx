import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { getAllTemplates } from '../template-actions';
import Link from 'next/link';
import TemplateFormWrapper from '@/components/incident/TemplateFormWrapper';

export default async function CreateIncidentPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const params = await searchParams;
  const templateId = params.template || null;

  const [services, users, permissions, customFields] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', role: { in: ['ADMIN', 'RESPONDER'] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    getUserPermissions(),
    prisma.customField.findMany({ orderBy: { order: 'asc' } }),
  ]);

  const templates = await getAllTemplates(permissions.id);

  const canCreateIncident = permissions.isResponderOrAbove;

  if (!canCreateIncident) {
    return (
      <main>
        <Link
          href="/incidents"
          style={{
            color: 'var(--text-muted)',
            marginBottom: '2rem',
            display: 'inline-block',
            textDecoration: 'none',
          }}
        >
          ← Back to Incidents
        </Link>

        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            maxWidth: '980px',
            margin: '0 auto',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  marginBottom: '0.35rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Create Incident
              </h1>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                ⚠️ You don't have access to create incidents. Responder role or above required.
              </p>
            </div>
            <Link href="/incidents" className="glass-button" style={{ textDecoration: 'none' }}>
              Back to Incidents
            </Link>
          </div>
          <div
            style={{
              padding: '2rem',
              background: 'white',
              borderRadius: '0px',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Incident creation form is disabled. Please contact an administrator to upgrade your
              role.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Link
        href="/incidents"
        style={{
          color: 'var(--text-muted)',
          marginBottom: '2rem',
          display: 'inline-block',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        ← Back to Incidents
      </Link>

      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          maxWidth: '980px',
          margin: '0 auto',
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '0px',
        }}
      >
        <div
          style={{
            marginBottom: '2rem',
            paddingBottom: '2rem',
            borderBottom: '2px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              marginBottom: '0.5rem',
            }}
          >
            <div style={{ flex: 1 }}>
              <h1
                style={{
                  fontSize: '2.25rem',
                  fontWeight: '800',
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Create Incident
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                Capture details and route to the appropriate team for response.
              </p>
            </div>
            <Link
              href="/incidents/templates"
              style={{
                padding: '0.625rem 1rem',
                background: '#f9fafb',
                border: '1px solid var(--border)',
                borderRadius: '0px',
                color: 'var(--primary-color)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              📋 Templates
            </Link>
          </div>
        </div>

        {/* Template Selector and Form */}
        <TemplateFormWrapper
          templates={templates as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          services={services}
          users={users}
          selectedTemplateId={templateId}
          customFields={customFields}
        />
      </div>
    </main>
  );
}
