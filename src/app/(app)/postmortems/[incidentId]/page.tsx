import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPostmortem } from '../actions';
import { notFound } from 'next/navigation';
import PostmortemForm from '@/components/PostmortemForm';
import PostmortemDetailView from '@/components/postmortem/PostmortemDetailView';
import { getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function PostmortemPage({
    params,
    searchParams,
}: {
    params: Promise<{ incidentId: string }>;
    searchParams?: Promise<{ edit?: string }>;
}) {
    const session = await getServerSession(await getAuthOptions());
    if (!session) {
        redirect('/login');
    }

    const { incidentId } = await params;
    const searchParamsData = await searchParams;
    const editMode = searchParamsData?.edit === 'true';

    const postmortem = await getPostmortem(incidentId);
    const permissions = await getUserPermissions();
    const canEdit = permissions.isResponderOrAbove;
    // All users can view published postmortems, but only responders+ can edit
    const canView = postmortem ? (postmortem.status === 'PUBLISHED' || canEdit) : canEdit;

    // Get users for action items assignment
    const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
    });

    if (!postmortem) {
        // Check if incident exists and is resolved
        const prisma = (await import('@/lib/prisma')).default;
        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
            select: { id: true, title: true, status: true },
        });

        if (!incident) {
            notFound();
        }

        if (incident.status !== 'RESOLVED') {
            return (
                <div style={{ padding: 'var(--spacing-6)' }}>
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-2)' }}>
                            Incident Not Resolved
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-4)' }}>
                            Postmortems can only be created for resolved incidents.
                        </p>
                        <Link
                            href={`/incidents/${incidentId}`}
                            style={{
                                display: 'inline-block',
                                padding: 'var(--spacing-2) var(--spacing-4)',
                                background: 'var(--primary)',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                textDecoration: 'none',
                            }}
                        >
                            View Incident
                        </Link>
                    </div>
                </div>
            );
        }

        // Show create form for new postmortem
        return (
            <div style={{ padding: 'var(--spacing-6)' }}>
                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                    <Link
                        href="/postmortems"
                        style={{
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            fontSize: 'var(--font-size-sm)',
                            marginBottom: 'var(--spacing-2)',
                            display: 'inline-block',
                        }}
                    >
                        ← Back to Postmortems
                    </Link>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
                        Create Postmortem
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        For incident: {incident.title}
                    </p>
                </div>

                {canEdit ? (
                    <PostmortemForm incidentId={incidentId} users={users} />
                ) : (
                    <div style={{ padding: 'var(--spacing-4)', background: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)' }}>
                        <p>You don't have permission to create postmortems.</p>
                    </div>
                )}
            </div>
        );
    }

    // Show existing postmortem
    return (
        <div style={{ padding: 'var(--spacing-6)' }}>
            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <Link
                    href="/postmortems"
                    style={{
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                        fontSize: 'var(--font-size-sm)',
                        marginBottom: 'var(--spacing-2)',
                        display: 'inline-block',
                    }}
                >
                    ← Back to Postmortems
                </Link>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {postmortem.title}
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Postmortem for{' '}
                    <Link
                        href={`/incidents/${incidentId}`}
                        style={{ color: 'var(--primary)', textDecoration: 'none' }}
                    >
                        {postmortem.incident.title}
                    </Link>
                </p>
            </div>

            {canView ? (
                editMode && canEdit ? (
                    <PostmortemForm incidentId={incidentId} initialData={postmortem} users={users} />
                ) : (
                    <PostmortemDetailView postmortem={postmortem} users={users} canEdit={canEdit} incidentId={incidentId} />
                )
            ) : (
                <div style={{ padding: 'var(--spacing-4)', background: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)' }}>
                    <p>You don't have permission to view this postmortem. Only published postmortems are publicly viewable.</p>
                </div>
            )}
        </div>
    );
}

