import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MobileAvatar } from '@/components/mobile/MobileUtils';
import MobileCard from '@/components/mobile/MobileCard';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MobileUserDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      teamMemberships: {
        include: {
          team: { select: { id: true, name: true } },
        },
      },
      assignedIncidents: {
        where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          service: { select: { name: true } },
        },
      },
      _count: {
        select: {
          assignedIncidents: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="mobile-dashboard">
      {/* Back Button */}
      <Link
        href="/m/users"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          color: 'var(--primary-color)',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: '600',
          marginBottom: '1rem',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Users
      </Link>

      {/* User Header */}
      <MobileCard padding="lg" className="mobile-incident-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <MobileAvatar name={user.name || user.email} size="lg" />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
              {user.name || 'Unknown User'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
              {user.email}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  background:
                    user.role === 'ADMIN' ? 'var(--badge-warning-bg)' : 'var(--bg-secondary)',
                  color:
                    user.role === 'ADMIN' ? 'var(--badge-warning-text)' : 'var(--text-secondary)',
                  textTransform: 'capitalize',
                }}
              >
                {user.role.toLowerCase()}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  background:
                    user.status === 'ACTIVE' ? 'var(--badge-success-bg)' : 'var(--badge-error-bg)',
                  color:
                    user.status === 'ACTIVE'
                      ? 'var(--badge-success-text)'
                      : 'var(--badge-error-text)',
                }}
              >
                {user.status}
              </span>
            </div>
          </div>
        </div>
      </MobileCard>

      {/* Teams Section */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 0.75rem' }}>
          Teams ({user.teamMemberships.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {user.teamMemberships.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No team memberships</p>
          ) : (
            user.teamMemberships.map(membership => (
              <Link
                key={membership.id}
                href={`/m/teams/${membership.team.id}`}
                style={{ textDecoration: 'none' }}
              >
                <MobileCard padding="sm">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {membership.team.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {membership.role}
                      </div>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-muted)"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </MobileCard>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Open Incidents Section */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 0.75rem' }}>
          Open Incidents ({user.assignedIncidents.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {user.assignedIncidents.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No open incidents</p>
          ) : (
            user.assignedIncidents.map(incident => (
              <Link
                key={incident.id}
                href={`/m/incidents/${incident.id}`}
                style={{ textDecoration: 'none' }}
              >
                <MobileCard padding="sm">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {incident.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: '0.125rem',
                        }}
                      >
                        {incident.service.name} • {incident.status}
                      </div>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-muted)"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </MobileCard>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
