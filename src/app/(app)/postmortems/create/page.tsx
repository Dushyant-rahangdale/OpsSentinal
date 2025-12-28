import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PostmortemForm from '@/components/PostmortemForm';
import { getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function CreatePostmortemPage() {
    const session = await getServerSession(await getAuthOptions());
    if (!session) {
        redirect('/login');
    }

    const permissions = await getUserPermissions();
    const canCreate = permissions.isResponderOrAbove;

    if (!canCreate) {
        return (
            <div style={{ padding: 'var(--spacing-6)' }}>
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
        include: {
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
                    Select a resolved incident and document the postmortem
                </p>
            </div>

            {resolvedIncidents.length === 0 ? (
                <div className="glass-panel" style={{
                    padding: 'var(--spacing-8)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    textAlign: 'center',
                }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--spacing-2)' }}>
                        No Resolved Incidents Available
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-4)' }}>
                        There are no resolved incidents without postmortems. Resolve an incident first to create a postmortem.
                    </p>
                    <Link
                        href="/incidents"
                        style={{
                            display: 'inline-block',
                            padding: 'var(--spacing-2) var(--spacing-4)',
                            background: 'var(--primary)',
                            color: 'white',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                        }}
                    >
                        View Incidents
                    </Link>
                </div>
            ) : (
                <PostmortemForm
                    incidentId=""
                    users={users}
                    resolvedIncidents={resolvedIncidents}
                />
            )}
        </div>
    );
}

