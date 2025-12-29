import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Role, UserStatus, AuditEntityType } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import {
    addUser,
    addUserToTeam,
    bulkUpdateUsers,
    deactivateUser,
    deleteUser,
    generateInvite,
    reactivateUser,
    updateUserRole
} from './actions';
import BulkUserActionsForm from '@/components/BulkUserActionsForm';
import UserCreateForm from '@/components/UserCreateForm';
import UserTable from '@/components/UserTable';

export const dynamic = 'force-dynamic';

const USERS_PER_PAGE = 20;
const HISTORY_PER_PAGE = 20;

type UsersPageProps = {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

function buildPaginationUrl(baseParams: URLSearchParams, page: number): string {
    const params = new URLSearchParams(baseParams);
    params.set('page', page.toString());
    return `/users?${params.toString()}`;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
    const awaitedSearchParams = await searchParams;
    const query = typeof awaitedSearchParams?.q === 'string' ? awaitedSearchParams.q.trim() : '';
    const statusFilter = typeof awaitedSearchParams?.status === 'string' ? awaitedSearchParams.status : '';
    const roleFilter = typeof awaitedSearchParams?.role === 'string' ? awaitedSearchParams.role : '';
    const teamFilter = typeof awaitedSearchParams?.teamId === 'string' ? awaitedSearchParams.teamId : '';
    const sortBy = typeof awaitedSearchParams?.sortBy === 'string' ? awaitedSearchParams.sortBy : 'createdAt';
    const sortOrder = typeof awaitedSearchParams?.sortOrder === 'string' ? awaitedSearchParams.sortOrder : 'desc';
    const page = Math.max(1, Number(awaitedSearchParams?.page) || 1);
    const historyPage = Math.max(1, Number(awaitedSearchParams?.historyPage) || 1);
    const skip = (page - 1) * USERS_PER_PAGE;
    const historySkip = (historyPage - 1) * HISTORY_PER_PAGE;

    // Security & Initialization Checks
    // 1. Enforce Authentication
    const session = await getServerSession(await getAuthOptions());
    if (!session) {
        redirect('/login?callbackUrl=/users');
    }

    // 2. Enforce System Setup
    // Check if any users exist. If not, the system is not initialized.
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        redirect('/setup');
    }

    const where: any = {
        AND: [
            query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' as const } },
                        { email: { contains: query, mode: 'insensitive' as const } }
                    ]
                }
                : {},
            statusFilter ? { status: statusFilter as UserStatus } : {},
            roleFilter ? { role: roleFilter as Role } : {},
            teamFilter ? { teamMemberships: { some: { teamId: teamFilter } } } : {}
        ].filter(Boolean)
    };

    const auditLogWhere = {
        entityType: {
            in: ['USER', 'TEAM', 'TEAM_MEMBER'] as AuditEntityType[]
        }
    };

    const [users, totalCount, auditLogs, auditLogTotal, teams, ownerCounts] = await Promise.all([
        prisma.user.findMany({
            include: {
                teamMemberships: {
                    include: {
                        team: true
                    }
                }
            },
            where,
            orderBy: sortBy === 'name'
                ? { name: sortOrder as 'asc' | 'desc' }
                : sortBy === 'email'
                    ? { email: sortOrder as 'asc' | 'desc' }
                    : sortBy === 'status'
                        ? { status: sortOrder as 'asc' | 'desc' }
                        : { createdAt: sortOrder as 'asc' | 'desc' },
            skip,
            take: USERS_PER_PAGE
        }),
        prisma.user.count({ where }),
        prisma.auditLog.findMany({
            include: {
                actor: true
            },
            where: auditLogWhere,
            orderBy: { createdAt: 'desc' },
            skip: historySkip,
            take: HISTORY_PER_PAGE
        }),
        prisma.auditLog.count({ where: auditLogWhere }),
        prisma.team.findMany({ orderBy: { name: 'asc' } }),
        prisma.teamMember.groupBy({
            by: ['teamId'],
            where: { role: 'OWNER' },
            _count: { _all: true }
        })
    ]);

    const ownerCountByTeam = new Map<string, number>();
    for (const entry of ownerCounts) {
        ownerCountByTeam.set(entry.teamId, entry._count._all);
    }

    // Optimize: Get stats efficiently (only if no filters applied, otherwise use filtered counts)
    const stats = {
        total: totalCount,
        active: 0,
        invited: 0,
        disabled: 0
    };

    // If filters are applied, get filtered stats; otherwise get all stats
    if (query || statusFilter || roleFilter || teamFilter) {
        // With filters, we already have totalCount, get breakdown
        const [activeCount, invitedCount, disabledCount] = await Promise.all([
            prisma.user.count({ where: { ...where, status: 'ACTIVE' } }),
            prisma.user.count({ where: { ...where, status: 'INVITED' } }),
            prisma.user.count({ where: { ...where, status: 'DISABLED' } })
        ]);
        stats.active = activeCount;
        stats.invited = invitedCount;
        stats.disabled = disabledCount;
    } else {
        // No filters - get all stats efficiently
        const [totalStats] = await Promise.all([
            prisma.user.groupBy({
                by: ['status'],
                _count: { _all: true }
            })
        ]);
        stats.active = totalStats.find(s => s.status === 'ACTIVE')?._count._all || 0;
        stats.invited = totalStats.find(s => s.status === 'INVITED')?._count._all || 0;
        stats.disabled = totalStats.find(s => s.status === 'DISABLED')?._count._all || 0;
    }

    const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);
    const historyTotalPages = Math.ceil(auditLogTotal / HISTORY_PER_PAGE);

    // Get current user for permission checks
    // session is already fetched at the top of the component
    const currentUserEmail = session?.user?.email;
    const currentUser = currentUserEmail
        ? await prisma.user.findUnique({
            where: { email: currentUserEmail },
            select: { id: true, role: true, timeZone: true }
        })
        : null;
    const currentUserId = currentUser?.id || '';
    const currentUserRole = (currentUser?.role as Role) || 'USER';
    const isAdmin = currentUserRole === 'ADMIN';
    const isAdminOrResponder = currentUserRole === 'ADMIN' || currentUserRole === 'RESPONDER';

    // Get user timezone for date formatting
    const userTimeZone = getUserTimeZone(currentUser ?? undefined);

    const baseParams = new URLSearchParams();
    if (query) baseParams.set('q', query);
    if (statusFilter) baseParams.set('status', statusFilter);
    if (roleFilter) baseParams.set('role', roleFilter);
    if (teamFilter) baseParams.set('teamId', teamFilter);
    if (sortBy !== 'createdAt') baseParams.set('sortBy', sortBy);
    if (sortOrder !== 'desc') baseParams.set('sortOrder', sortOrder);

    const historyBaseParams = new URLSearchParams();
    if (query) historyBaseParams.set('q', query);
    if (statusFilter) historyBaseParams.set('status', statusFilter);
    if (roleFilter) historyBaseParams.set('role', roleFilter);
    if (teamFilter) historyBaseParams.set('teamId', teamFilter);
    if (page > 1) historyBaseParams.set('page', page.toString());
    if (sortBy !== 'createdAt') historyBaseParams.set('sortBy', sortBy);
    if (sortOrder !== 'desc') historyBaseParams.set('sortOrder', sortOrder);

    function buildHistoryPaginationUrl(pageNum: number): string {
        const params = new URLSearchParams(historyBaseParams);
        params.set('historyPage', pageNum.toString());
        return `/users?${params.toString()}`;
    }

    function buildSortUrl(newSortBy: string): string {
        const params = new URLSearchParams(baseParams);
        if (sortBy === newSortBy && sortOrder === 'asc') {
            params.set('sortBy', newSortBy);
            params.set('sortOrder', 'desc');
        } else if (sortBy === newSortBy) {
            params.delete('sortBy');
            params.delete('sortOrder');
        } else {
            params.set('sortBy', newSortBy);
            params.set('sortOrder', 'asc');
        }
        params.delete('page'); // Reset to page 1 when sorting
        return `/users?${params.toString()}`;
    }

    // Keep old function for backwards compatibility
    function buildSortUrlOld(field: string): string {
        const params = new URLSearchParams(baseParams);
        const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
        params.set('sortBy', field);
        params.set('sortOrder', newOrder);
        params.delete('page'); // Reset to page 1 when sorting
        return `/users?${params.toString()}`;
    }

    return (
        <main style={{ padding: '0 1rem 2rem' }}>
            {/* Hero Section */}
            <div style={{
                background: 'var(--gradient-primary)',
                color: 'white',
                padding: '2rem',
                borderRadius: '12px',
                marginBottom: '2rem',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Users</h1>
                    <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>
                        Manage responders, roles, and team assignments
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(100px, 1fr))', gap: '1rem', width: '100%', maxWidth: '600px' }}>
                    <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{stats.total}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>TOTAL</div>
                    </div>
                    <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{stats.active}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>ACTIVE</div>
                    </div>
                    <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{stats.invited}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>INVITED</div>
                    </div>
                    <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{stats.disabled}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>DISABLED</div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 320px', gap: '1.5rem' }}>
                {/* Left Column - Filters and Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Filters Panel */}
                    <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Filter Users</h2>
                        {/* Quick Filter Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <Link href="/users" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', background: !statusFilter && !roleFilter && !teamFilter && !query ? 'var(--primary)' : 'rgba(211, 47, 47, 0.1)', color: !statusFilter && !roleFilter && !teamFilter && !query ? 'white' : 'var(--primary)', fontWeight: '600' }}>
                                All Users
                            </Link>
                            <Link href="/users?status=ACTIVE" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', background: statusFilter === 'ACTIVE' ? 'var(--primary)' : 'rgba(211, 47, 47, 0.1)', color: statusFilter === 'ACTIVE' ? 'white' : 'var(--primary)', fontWeight: '600' }}>
                                Active
                            </Link>
                            <Link href="/users?status=INVITED" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', background: statusFilter === 'INVITED' ? 'var(--primary)' : 'rgba(211, 47, 47, 0.1)', color: statusFilter === 'INVITED' ? 'white' : 'var(--primary)', fontWeight: '600' }}>
                                Invited
                            </Link>
                            <Link href="/users?status=DISABLED" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', background: statusFilter === 'DISABLED' ? 'var(--primary)' : 'rgba(211, 47, 47, 0.1)', color: statusFilter === 'DISABLED' ? 'white' : 'var(--primary)', fontWeight: '600' }}>
                                Disabled
                            </Link>
                            <Link href="/users?role=ADMIN" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', background: roleFilter === 'ADMIN' ? 'var(--primary)' : 'rgba(211, 47, 47, 0.1)', color: roleFilter === 'ADMIN' ? 'white' : 'var(--primary)', fontWeight: '600' }}>
                                Admins
                            </Link>
                        </div>
                        <form method="get" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Search</label>
                                <input
                                    name="q"
                                    defaultValue={query}
                                    placeholder="Name or email"
                                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</label>
                                <select name="status" defaultValue={statusFilter || ''} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', background: 'white' }}>
                                    <option value="">All</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="DISABLED">Disabled</option>
                                    <option value="INVITED">Invited</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Role</label>
                                <select name="role" defaultValue={roleFilter || ''} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', background: 'white' }}>
                                    <option value="">All</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="RESPONDER">Responder</option>
                                    <option value="USER">User</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Team</label>
                                <select name="teamId" defaultValue={teamFilter || ''} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', background: 'white' }}>
                                    <option value="">All</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="glass-button primary" style={{ whiteSpace: 'nowrap' }}>Apply Filters</button>
                                <a href="/users" className="glass-button" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>Clear</a>
                            </div>
                        </form>
                    </div>

                    {/* Bulk Actions */}
                    <div className="glass-panel" style={{ background: 'white', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '0.25rem' }}>Bulk Actions</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select users to update status, roles, or remove.</p>
                            </div>
                            <BulkUserActionsForm
                                action={bulkUpdateUsers}
                                formId="bulk-users-form"
                                className="bulk-actions-form-inline"
                                disabled={!isAdmin}
                            />
                        </div>
                    </div>

                    {/* Users Table - Cleaner Design */}
                    <div className="glass-panel" style={{ background: 'white', padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.15rem' }}>User Directory</h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Showing {skip + 1}-{Math.min(skip + USERS_PER_PAGE, totalCount)} of {totalCount} users
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Sort:</span>
                                <Link href={buildSortUrl('name')} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: sortBy === 'name' ? 'rgba(211, 47, 47, 0.1)' : 'transparent', textDecoration: 'none', color: sortBy === 'name' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </Link>
                                <Link href={buildSortUrl('email')} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: sortBy === 'email' ? 'rgba(211, 47, 47, 0.1)' : 'transparent', textDecoration: 'none', color: sortBy === 'email' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                    Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </Link>
                                <Link href={buildSortUrl('status')} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: sortBy === 'status' ? 'rgba(211, 47, 47, 0.1)' : 'transparent', textDecoration: 'none', color: sortBy === 'status' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </Link>
                                <Link href={buildSortUrl('createdAt')} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: sortBy === 'createdAt' ? 'rgba(211, 47, 47, 0.1)' : 'transparent', textDecoration: 'none', color: sortBy === 'createdAt' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                    Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </Link>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            {users.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '0.9rem' }}>No users found matching your filters.</p>
                                </div>
                            ) : (
                                <UserTable
                                    users={users}
                                    teams={teams}
                                    ownerCountByTeam={ownerCountByTeam}
                                    currentUserId={currentUserId}
                                    currentUserRole={currentUserRole}
                                    isAdmin={isAdmin}
                                    isAdminOrResponder={isAdminOrResponder}
                                    updateUserRole={updateUserRole}
                                    deactivateUser={deactivateUser}
                                    reactivateUser={reactivateUser}
                                    deleteUser={deleteUser}
                                    generateInvite={generateInvite}
                                    addUserToTeam={addUserToTeam}
                                    sortBy={sortBy}
                                    sortOrder={sortOrder}
                                />
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Page {page} of {totalPages}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <Link
                                        href={buildPaginationUrl(baseParams, 1)}
                                        className={`glass-button ${page === 1 ? 'disabled' : ''}`}
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            fontSize: '0.8rem',
                                            textDecoration: 'none',
                                            opacity: page === 1 ? 0.5 : 1,
                                            pointerEvents: page === 1 ? 'none' : 'auto'
                                        }}
                                    >
                                        First
                                    </Link>
                                    <Link
                                        href={buildPaginationUrl(baseParams, Math.max(1, page - 1))}
                                        className={`glass-button ${page === 1 ? 'disabled' : ''}`}
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            fontSize: '0.8rem',
                                            textDecoration: 'none',
                                            opacity: page === 1 ? 0.5 : 1,
                                            pointerEvents: page === 1 ? 'none' : 'auto'
                                        }}
                                    >
                                        Previous
                                    </Link>
                                    <Link
                                        href={buildPaginationUrl(baseParams, Math.min(totalPages, page + 1))}
                                        className={`glass-button ${page === totalPages ? 'disabled' : ''}`}
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            fontSize: '0.8rem',
                                            textDecoration: 'none',
                                            opacity: page === totalPages ? 0.5 : 1,
                                            pointerEvents: page === totalPages ? 'none' : 'auto'
                                        }}
                                    >
                                        Next
                                    </Link>
                                    <Link
                                        href={buildPaginationUrl(baseParams, totalPages)}
                                        className={`glass-button ${page === totalPages ? 'disabled' : ''}`}
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            fontSize: '0.8rem',
                                            textDecoration: 'none',
                                            opacity: page === totalPages ? 0.5 : 1,
                                            pointerEvents: page === totalPages ? 'none' : 'auto'
                                        }}
                                    >
                                        Last
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Invite User Panel */}
                    <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Invite New User</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Add responders with a role and send a secure invite instantly.
                        </p>
                        <UserCreateForm action={addUser} disabled={!isAdmin} />
                    </div>

                    {/* Audit Log Panel - Matches User Directory Height */}
                    <div className="glass-panel" style={{ background: 'white', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Access History</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Showing {historySkip + 1}-{Math.min(historySkip + HISTORY_PER_PAGE, auditLogTotal)} of {auditLogTotal} entries
                            </p>
                        </div>
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                            minHeight: '400px'
                        }}>
                            {auditLogs.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    No access activity yet.
                                </div>
                            ) : (
                                auditLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        style={{
                                            padding: '0.7rem 0.85rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            background: '#f9fafb',
                                            transition: 'background 0.15s ease'
                                        }}
                                        className="audit-log-entry"
                                    >
                                        <div style={{ fontWeight: '600', fontSize: '0.8rem', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>
                                            {log.action}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>{log.actor?.name || "System"}</span>
                                            <span style={{ whiteSpace: 'nowrap' }}>
                                                {formatDateTime(log.createdAt, userTimeZone, { format: 'datetime' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* History Pagination */}
                        {historyTotalPages > 1 && (
                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Page {historyPage} of {historyTotalPages}
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <Link
                                        href={buildHistoryPaginationUrl(1)}
                                        className={`glass-button ${historyPage === 1 ? 'disabled' : ''}`}
                                        style={{
                                            padding: '0.35rem 0.7rem',
                                            fontSize: '0.75rem',
                                            textDecoration: 'none',
                                            opacity: historyPage === 1 ? 0.5 : 1,
                                            pointerEvents: historyPage === 1 ? 'none' : 'auto'
                                        }}
                                    >
                                        First
                                    </Link>
                                    <Link
                                        href={buildHistoryPaginationUrl(Math.max(1, historyPage - 1))}
                                        className={`glass-button ${historyPage === 1 ? 'disabled' : ''}`}
                                        style={{
                                            padding: '0.35rem 0.7rem',
                                            fontSize: '0.75rem',
                                            textDecoration: 'none',
                                            opacity: historyPage === 1 ? 0.5 : 1,
                                            pointerEvents: historyPage === 1 ? 'none' : 'auto'
                                        }}
                                    >
                                        Prev
                                    </Link>
                                    <Link
                                        href={buildHistoryPaginationUrl(Math.min(historyTotalPages, historyPage + 1))}
                                        className={`glass-button ${historyPage === historyTotalPages ? 'disabled' : ''}`}
                                        style={{
                                            padding: '0.35rem 0.7rem',
                                            fontSize: '0.75rem',
                                            textDecoration: 'none',
                                            opacity: historyPage === historyTotalPages ? 0.5 : 1,
                                            pointerEvents: historyPage === historyTotalPages ? 'none' : 'auto'
                                        }}
                                    >
                                        Next
                                    </Link>
                                    <Link
                                        href={buildHistoryPaginationUrl(historyTotalPages)}
                                        className={`glass-button ${historyPage === historyTotalPages ? 'disabled' : ''}`}
                                        style={{
                                            padding: '0.35rem 0.7rem',
                                            fontSize: '0.75rem',
                                            textDecoration: 'none',
                                            opacity: historyPage === historyTotalPages ? 0.5 : 1,
                                            pointerEvents: historyPage === historyTotalPages ? 'none' : 'auto'
                                        }}
                                    >
                                        Last
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </main>
    );
}
