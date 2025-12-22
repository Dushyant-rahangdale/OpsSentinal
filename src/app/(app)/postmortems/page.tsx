import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllPostmortems } from './actions';
import { getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { Badge } from '@/components/ui';

export default async function PostmortemsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    const params = await searchParams;
    const status = params.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined;

    const postmortems = await getAllPostmortems(status);
    const permissions = await getUserPermissions();
    const canCreate = permissions.isResponderOrAbove;

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
        <div style={{ padding: 'var(--spacing-6)', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ 
                marginBottom: 'var(--spacing-8)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                gap: 'var(--spacing-4)',
                paddingBottom: 'var(--spacing-6)',
                borderBottom: '2px solid #e2e8f0',
            }}>
                <div>
                    <h1 style={{ 
                        fontSize: '2.5rem', 
                        fontWeight: '800', 
                        marginBottom: 'var(--spacing-2)',
                        background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em',
                    }}>
                        Postmortems
                    </h1>
                    <p style={{ 
                        color: 'var(--text-muted)', 
                        fontSize: 'var(--font-size-base)',
                        lineHeight: '1.6',
                    }}>
                        Learn from incidents and improve your incident response process
                    </p>
                </div>
                {resolvedIncidentsWithoutPostmortems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', minWidth: '200px' }}>
                        <Link href="/postmortems/create">
                            <Button variant="primary">
                                Create Postmortem
                            </Button>
                        </Link>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                            {resolvedIncidentsWithoutPostmortems.length} resolved incident{resolvedIncidentsWithoutPostmortems.length !== 1 ? 's' : ''} available
                        </p>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div style={{ 
                marginBottom: 'var(--spacing-6)', 
                display: 'flex', 
                gap: 'var(--spacing-2)',
                padding: 'var(--spacing-1)',
                background: '#f8fafc',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #e2e8f0',
                width: 'fit-content',
            }}>
                <Link
                    href="/postmortems"
                    style={{
                        padding: 'var(--spacing-2) var(--spacing-5)',
                        borderRadius: 'var(--radius-md)',
                        background: !status ? 'var(--primary)' : 'transparent',
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
                        background: status === 'PUBLISHED' ? 'var(--primary)' : 'transparent',
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
                        background: status === 'DRAFT' ? 'var(--primary)' : 'transparent',
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
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-4)' }}>
                            {status
                                ? `No ${status.toLowerCase()} postmortems found.`
                                : 'No postmortems found. Create one from a resolved incident.'}
                        </p>
                        {resolvedIncidentsWithoutPostmortems.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', alignItems: 'center' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-2)' }}>
                                    Resolved incidents available for postmortem:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', width: '100%', maxWidth: '400px' }}>
                                    {resolvedIncidentsWithoutPostmortems.slice(0, 5).map((incident) => (
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
                                            <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--spacing-1)' }}>
                                                {incident.title}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                Resolved {incident.resolvedAt?.toLocaleDateString()}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 'var(--spacing-5)' }}>
                    {postmortems.map((postmortem) => (
                        <Card 
                            key={postmortem.id} 
                            variant="elevated"
                            style={{
                                transition: 'all 0.3s ease',
                                border: '1px solid #e2e8f0',
                            }}
                            hover={true}
                        >
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'start', 
                                    marginBottom: 'var(--spacing-4)',
                                    gap: 'var(--spacing-3)',
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Link
                                            href={`/postmortems/${postmortem.incidentId}`}
                                            style={{
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: '700',
                                                color: 'var(--text-primary)',
                                                textDecoration: 'none',
                                                display: 'block',
                                                marginBottom: 'var(--spacing-2)',
                                                lineHeight: '1.4',
                                                transition: 'color 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                        >
                                            {postmortem.title}
                                        </Link>
                                        <Link
                                            href={`/incidents/${postmortem.incidentId}`}
                                            style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--text-muted)',
                                                textDecoration: 'none',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-1)',
                                                transition: 'color 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
                                            </svg>
                                            {postmortem.incident.title}
                                        </Link>
                                    </div>
                                    <Badge
                                        variant={
                                            postmortem.status === 'PUBLISHED'
                                                ? 'success'
                                                : postmortem.status === 'ARCHIVED'
                                                ? 'default'
                                                : 'warning'
                                        }
                                        style={{
                                            flexShrink: 0,
                                        }}
                                    >
                                        {postmortem.status}
                                    </Badge>
                                </div>

                                {postmortem.summary && (
                                    <p
                                        style={{
                                            color: 'var(--text-secondary)',
                                            fontSize: 'var(--font-size-sm)',
                                            marginBottom: 'var(--spacing-4)',
                                            lineHeight: '1.7',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {postmortem.summary}
                                    </p>
                                )}

                                <div style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap',
                                    gap: 'var(--spacing-3)', 
                                    fontSize: 'var(--font-size-xs)', 
                                    color: 'var(--text-muted)',
                                    paddingTop: 'var(--spacing-4)',
                                    borderTop: '1px solid #f1f5f9',
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        {postmortem.createdBy.name}
                                    </span>
                                    <span>•</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        {postmortem.createdAt.toLocaleDateString()}
                                    </span>
                                    {postmortem.publishedAt && (
                                        <>
                                            <span>•</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                                Published {postmortem.publishedAt.toLocaleDateString()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

