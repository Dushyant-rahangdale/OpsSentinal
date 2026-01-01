import prisma from '@/lib/prisma';
import Link from 'next/link';
import { MobileAvatar, MobileEmptyState } from '@/components/mobile/MobileUtils';
import { MobileSearchWithParams } from '@/components/mobile/MobileSearchParams';
import MobileCard from '@/components/mobile/MobileCard';

export const dynamic = 'force-dynamic';

export default async function MobileUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const params = await searchParams;
    const query = params.q || '';

    const users = await prisma.user.findMany({
        where: query ? {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
            ]
        } : undefined,
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });

    return (
        <div className="mobile-dashboard">
            {/* Header */}
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Users</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {users.length} member{users.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Search */}
            <MobileSearchWithParams placeholder="Search users by name or email..." />
            <div style={{ height: '0.75rem' }} />

            {/* User List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {users.length === 0 ? (
                    <MobileEmptyState
                        icon="👥"
                        title="No users found"
                        description="Invite team members to get started"
                    />
                ) : (
                    users.map((user) => (
                        <Link key={user.id} href={`/m/users/${user.id}`} style={{ textDecoration: 'none' }}>
                            <MobileCard padding="md">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <MobileAvatar name={user.name || user.email} />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            color: 'var(--text-primary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {user.name || 'Unknown'}
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {user.email}
                                        </div>
                                    </div>

                                    <div style={{
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '6px',
                                        background: user.role === 'ADMIN'
                                            ? 'var(--badge-warning-bg)'
                                            : 'var(--bg-secondary)',
                                        color: user.role === 'ADMIN'
                                            ? 'var(--badge-warning-text)'
                                            : 'var(--text-secondary)',
                                        textTransform: 'capitalize'
                                    }}>
                                        {user.role.toLowerCase()}
                                    </div>

                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </MobileCard>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
