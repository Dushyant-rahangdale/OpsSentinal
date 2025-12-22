import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PostmortemForm from '@/components/PostmortemForm';
import { getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function CreatePostmortemPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    const permissions = await getUserPermissions();
    const canCreate = permissions.isResponderOrAbove;

    if (!canCreate) {
        return (
            <div style={{ padding: 'var(--spacing-6)', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ padding: 'var(--spacing-4)', background: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)' }}>
                    <p>You don't have permission to create postmortems.</p>
                </div>
            </div>
        );
    }

    // Get all resolved incidents without postmortems
    const resolvedIncidents = await prisma.incident.findMany({
        where: {
            status: 'RESOLVED',
            postmortem: null,
        },
        select: {
            id: true,
            title: true,
            resolvedAt: true,
            service: {
                select: {
                    name: true,
                },
            },
        },
        orderBy: { resolvedAt: 'desc' },
        take: 100,
    });

    // Get users for action items assignment
    const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
    });

    return (
        <div style={{ padding: 'var(--spacing-6)', maxWidth: '1200px', margin: '0 auto' }}>
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
                    Select a resolved incident and document the postmortem
                </p>
            </div>

            <PostmortemForm 
                incidentId="" 
                users={users} 
                resolvedIncidents={resolvedIncidents}
            />
        </div>
    );
}

