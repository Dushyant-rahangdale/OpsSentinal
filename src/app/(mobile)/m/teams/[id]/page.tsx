import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MobileAvatar } from '@/components/mobile/MobileUtils';
import MobileCard from '@/components/mobile/MobileCard';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MobileTeamDetailPage({ params }: PageProps) {
  const { id } = await params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
      _count: {
        select: {
          incidents: {
            where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] } },
          },
        },
      },
    },
  });

  if (!team) {
    notFound();
  }

  return (
    <div className="mobile-dashboard">
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          href="/m/teams"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: 'var(--primary-color)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: '0.75rem',
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
          Back to Teams
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '1.25rem',
              flexShrink: 0,
            }}
          >
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>{team.name}</h1>
            {team.description && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                {team.description}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginTop: '0.25rem',
              }}
            >
              <span>
                👥 {team.members.length} member{team.members.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Team Members */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 0.75rem' }}>Members</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {team.members.map(member => (
              <MobileCard key={member.id} padding="sm">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <MobileAvatar name={member.user.name || member.user.email} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {member.user.name || 'Unknown'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {member.role || 'Member'}
                    </div>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
