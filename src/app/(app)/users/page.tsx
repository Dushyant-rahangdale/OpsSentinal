import prisma from '@/lib/prisma';
import Link from 'next/link';
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
import DeleteUserButton from '@/components/DeleteUserButton';
import UserCreateForm from '@/components/UserCreateForm';
import InviteLinkButton from '@/components/InviteLinkButton';
import RoleSelector from '@/components/RoleSelector';

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
    const page = Math.max(1, Number(awaitedSearchParams?.page) || 1);
    const historyPage = Math.max(1, Number(awaitedSearchParams?.historyPage) || 1);
    const skip = (page - 1) * USERS_PER_PAGE;
    const historySkip = (historyPage - 1) * HISTORY_PER_PAGE;

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
            statusFilter ? { status: statusFilter as any } : {},
            roleFilter ? { role: roleFilter as any } : {},
            teamFilter ? { teamMemberships: { some: { teamId: teamFilter } } } : {}
        ].filter(Boolean)
    };

    const auditLogWhere: any = {
        entityType: {
            in: ['USER', 'TEAM', 'TEAM_MEMBER']
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
            orderBy: { createdAt: 'desc' },
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

    // Get total stats (not just current page)
    const [totalStats] = await Promise.all([
        prisma.user.groupBy({
            by: ['status'],
            _count: { _all: true }
        })
    ]);

    const stats = {
        total: totalCount,
        active: totalStats.find(s => s.status === 'ACTIVE')?._count._all || 0,
        invited: totalStats.find(s => s.status === 'INVITED')?._count._all || 0,
        disabled: totalStats.find(s => s.status === 'DISABLED')?._count._all || 0
    };

    const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);
    const historyTotalPages = Math.ceil(auditLogTotal / HISTORY_PER_PAGE);
    const baseParams = new URLSearchParams();
    if (query) baseParams.set('q', query);
    if (statusFilter) baseParams.set('status', statusFilter);
    if (roleFilter) baseParams.set('role', roleFilter);
    if (teamFilter) baseParams.set('teamId', teamFilter);
    
    const historyBaseParams = new URLSearchParams();
    if (query) historyBaseParams.set('q', query);
    if (statusFilter) historyBaseParams.set('status', statusFilter);
    if (roleFilter) historyBaseParams.set('role', roleFilter);
    if (teamFilter) historyBaseParams.set('teamId', teamFilter);
    if (page > 1) historyBaseParams.set('page', page.toString());
    
    function buildHistoryPaginationUrl(pageNum: number): string {
        const params = new URLSearchParams(historyBaseParams);
        params.set('historyPage', pageNum.toString());
        return `/users?${params.toString()}`;
    }

    return (
        <main style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '2rem' }}>
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
                            />
                        </div>
                    </div>

                    {/* Users Table - Cleaner Design */}
                    <div className="glass-panel" style={{ background: 'white', padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.15rem' }}>User Directory</h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Showing {skip + 1}-{Math.min(skip + USERS_PER_PAGE, totalCount)} of {totalCount} users
                                </p>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            {users.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '0.9rem' }}>No users found matching your filters.</p>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid var(--border)' }}>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', width: '40px' }}>
                                                <input type="checkbox" style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                            </th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>User</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', width: '140px' }}>Role</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', width: '100px' }}>Status</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Teams</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', width: '120px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user: any) => {
                                            const updateRole = updateUserRole.bind(null, user.id);
                                            const deactivate = deactivateUser.bind(null, user.id);
                                            const reactivate = reactivateUser.bind(null, user.id);
                                            const removeUser = deleteUser.bind(null, user.id);
                                            const inviteUser = generateInvite.bind(null, user.id);
                                            const assignToTeam = addUserToTeam.bind(null, user.id);
                                            const availableTeams = teams.filter(
                                                (team) => !user.teamMemberships?.some((member: any) => member.teamId === team.id)
                                            );
                                            const isSoleOwner = user.teamMemberships?.some(
                                                (member: any) => member.role === "OWNER" && ownerCountByTeam.get(member.teamId) === 1
                                            );

                                            return (
                                                <tr 
                                                    key={user.id} 
                                                    style={{ 
                                                        borderBottom: '1px solid #f1f5f9'
                                                    }}
                                                    className="user-table-row"
                                                >
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="userIds"
                                                            value={user.id}
                                                            form="bulk-users-form"
                                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.15rem' }}>{user.name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        <RoleSelector 
                                                            userId={user.id}
                                                            currentRole={user.role}
                                                            updateRole={updateRole}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        <span style={{
                                                            padding: '0.2rem 0.6rem',
                                                            borderRadius: '999px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: '700',
                                                            textTransform: 'uppercase',
                                                            background: user.status === 'ACTIVE' ? '#e6f4ea' : user.status === 'INVITED' ? '#fff3e0' : '#fee2e2',
                                                            color: user.status === 'ACTIVE' ? '#0f5132' : user.status === 'INVITED' ? '#b45309' : '#b91c1c',
                                                            display: 'inline-block'
                                                        }}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        {!user.teamMemberships || user.teamMemberships.length === 0 ? (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                                {user.teamMemberships.slice(0, 2).map((member: any) => (
                                                                    <span
                                                                        key={member.id}
                                                                        style={{
                                                                            padding: '0.15rem 0.5rem',
                                                                            borderRadius: '999px',
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: '600',
                                                                            background: member.role === "OWNER" ? '#fee2e2' : member.role === "ADMIN" ? '#fef3c7' : '#ecfdf5',
                                                                            color: member.role === "OWNER" ? '#b91c1c' : member.role === "ADMIN" ? '#78350f' : '#065f46'
                                                                        }}
                                                                        title={`${member.team.name} (${member.role})`}
                                                                    >
                                                                        {member.team.name}
                                                                    </span>
                                                                ))}
                                                                {user.teamMemberships.length > 2 && (
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title={user.teamMemberships.slice(2).map((m: any) => `${m.team.name} (${m.role})`).join(', ')}>
                                                                        +{user.teamMemberships.length - 2}
                                                                    </span>
                                                            )}
                                                        </div>
                                                        )}
                                                        {availableTeams.length > 0 && (
                                                            <form action={assignToTeam} style={{ marginTop: '0.4rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                                <select name="teamId" defaultValue="" style={{ padding: '0.25rem 0.4rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', minWidth: '100px', background: 'white' }}>
                                                                    <option value="" disabled>Add team</option>
                                                                    {availableTeams.map((team) => (
                                                                        <option key={team.id} value={team.id}>
                                                                            {team.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <select name="role" defaultValue="MEMBER" style={{ padding: '0.25rem 0.4rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', background: 'white' }}>
                                                                    <option value="MEMBER">Member</option>
                                                                    <option value="ADMIN">Admin</option>
                                                                    <option value="OWNER">Owner</option>
                                                                </select>
                                                                <button type="submit" className="glass-button" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                                                                    Add
                                                                </button>
                                                            </form>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                            {user.status === "INVITED" && (
                                                                <InviteLinkButton action={inviteUser} className="invite-link-inline" />
                                                            )}
                                                            {user.status === "DISABLED" ? (
                                                                <form action={reactivate}>
                                                                    <button type="submit" className="glass-button primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem' }}>
                                                                        Activate
                                                                    </button>
                                                                </form>
                                                            ) : user.status === "INVITED" ? (
                                                                <form action={reactivate}>
                                                                    <button type="submit" className="glass-button primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem' }}>
                                                                        Activate
                                                                    </button>
                                                                </form>
                                                            ) : (
                                                                <form action={deactivate}>
                                                                    <button type="submit" className="glass-button" style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                                                                        Deactivate
                                                                    </button>
                                                                </form>
                                                            )}
                                                            <DeleteUserButton
                                                                action={removeUser}
                                                                className={isSoleOwner ? "glass-button" : "glass-button"}
                                                                disabled={isSoleOwner}
                                                                title={
                                                                    isSoleOwner
                                                                        ? "Reassign team ownership before deleting this user."
                                                                        : "Delete user"
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
                        <UserCreateForm action={addUser} />
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
                                                {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
