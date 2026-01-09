import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllPostmortems } from './actions';
import { getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import PostmortemCard from '@/components/PostmortemCard';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

export default async function PostmortemsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(await getAuthOptions());
  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const status = params.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined;

  const postmortems = await getAllPostmortems(status);
  const permissions = await getUserPermissions();
  const canCreate = permissions.isResponderOrAbove;

  // Get user timezone for date formatting
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { timeZone: true },
      })
    : null;
  const userTimeZone = getUserTimeZone(user ?? undefined);

  // Get resolved incidents without postmortems for quick create
  const resolvedIncidentsWithoutPostmortems = canCreate
    ? await prisma.incident.findMany({
        where: {
          status: 'RESOLVED',
          postmortem: null,
        },
        select: {
          id: true,
          title: true,
          resolvedAt: true,
        },
        orderBy: { resolvedAt: 'desc' },
        take: 10,
      })
    : [];

  return (
    <div className="[zoom:0.8]" style={{ padding: 'var(--spacing-6)' }}>
      <div
        style={{
          marginBottom: 'var(--spacing-8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--spacing-4)',
          paddingBottom: 'var(--spacing-6)',
          borderBottom: '2px solid #e2e8f0',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              marginBottom: 'var(--spacing-2)',
              background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            Postmortems
          </h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-base)',
              lineHeight: '1.6',
            }}
          >
            Learn from incidents and improve your incident response process
          </p>
        </div>
        {resolvedIncidentsWithoutPostmortems.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
              minWidth: '200px',
            }}
          >
            <Link href="/postmortems/create">
              <Button variant="primary">Create Postmortem</Button>
            </Link>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-muted)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              {resolvedIncidentsWithoutPostmortems.length} resolved incident
              {resolvedIncidentsWithoutPostmortems.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          marginBottom: 'var(--spacing-6)',
          display: 'flex',
          gap: 'var(--spacing-2)',
          padding: 'var(--spacing-1)',
          background: '#f8fafc',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #e2e8f0',
          width: 'fit-content',
        }}
      >
        <Link
          href="/postmortems"
          style={{
            padding: 'var(--spacing-2) var(--spacing-5)',
            borderRadius: 'var(--radius-md)',
            background: !status ? 'var(--primary-color)' : 'transparent',
            color: !status ? 'white' : 'var(--text-primary)',
            textDecoration: 'none',
            fontSize: 'var(--font-size-sm)',
            fontWeight: !status ? '600' : '500',
            transition: 'all 0.2s ease',
            boxShadow: !status ? '0 2px 8px rgba(211, 47, 47, 0.2)' : 'none',
          }}
        >
          All
        </Link>
        <Link
          href="/postmortems?status=PUBLISHED"
          style={{
            padding: 'var(--spacing-2) var(--spacing-5)',
            borderRadius: 'var(--radius-md)',
            background: status === 'PUBLISHED' ? 'var(--primary-color)' : 'transparent',
            color: status === 'PUBLISHED' ? 'white' : 'var(--text-primary)',
            textDecoration: 'none',
            fontSize: 'var(--font-size-sm)',
            fontWeight: status === 'PUBLISHED' ? '600' : '500',
            transition: 'all 0.2s ease',
            boxShadow: status === 'PUBLISHED' ? '0 2px 8px rgba(211, 47, 47, 0.2)' : 'none',
          }}
        >
          Published
        </Link>
        <Link
          href="/postmortems?status=DRAFT"
          style={{
            padding: 'var(--spacing-2) var(--spacing-5)',
            borderRadius: 'var(--radius-md)',
            background: status === 'DRAFT' ? 'var(--primary-color)' : 'transparent',
            color: status === 'DRAFT' ? 'white' : 'var(--text-primary)',
            textDecoration: 'none',
            fontSize: 'var(--font-size-sm)',
            fontWeight: status === 'DRAFT' ? '600' : '500',
            transition: 'all 0.2s ease',
            boxShadow: status === 'DRAFT' ? '0 2px 8px rgba(211, 47, 47, 0.2)' : 'none',
          }}
        >
          Drafts
        </Link>
      </div>

      {/* Postmortems List */}
      {postmortems.length === 0 ? (
        <Card>
          <div style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-base)',
                marginBottom: 'var(--spacing-4)',
              }}
            >
              {status
                ? `No ${status.toLowerCase()} postmortems found.`
                : 'No postmortems found. Create one from a resolved incident.'}
            </p>
            {resolvedIncidentsWithoutPostmortems.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-3)',
                  alignItems: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--spacing-2)',
                  }}
                >
                  Resolved incidents available for postmortem:
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-2)',
                    width: '100%',
                    maxWidth: '400px',
                  }}
                >
                  {resolvedIncidentsWithoutPostmortems.slice(0, 5).map(incident => (
                    <Link
                      key={incident.id}
                      href={`/postmortems/${incident.id}`}
                      style={{
                        padding: 'var(--spacing-3)',
                        background: 'var(--color-neutral-50)',
                        border: '1px solid var(--color-neutral-200)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        display: 'block',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--text-primary)',
                          marginBottom: 'var(--spacing-1)',
                        }}
                      >
                        {incident.title}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        Resolved{' '}
                        {incident.resolvedAt
                          ? formatDateTime(incident.resolvedAt, userTimeZone, { format: 'date' })
                          : 'N/A'}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))',
            gap: 'var(--spacing-5)',
          }}
        >
          {postmortems.map(postmortem => (
            <PostmortemCard key={postmortem.id} postmortem={postmortem} />
          ))}
        </div>
      )}
    </div>
  );
}
