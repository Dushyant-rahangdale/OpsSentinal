import prisma from '@/lib/prisma';
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

export const dynamic = 'force-dynamic';

type UsersPageProps = {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
    const awaitedSearchParams = await searchParams;
    const query = typeof awaitedSearchParams?.q === 'string' ? awaitedSearchParams.q.trim() : '';
    const statusFilter = typeof awaitedSearchParams?.status === 'string' ? awaitedSearchParams.status : '';
    const roleFilter = typeof awaitedSearchParams?.role === 'string' ? awaitedSearchParams.role : '';
    const teamFilter = typeof awaitedSearchParams?.teamId === 'string' ? awaitedSearchParams.teamId : '';

    const [users, auditLogs, teams, ownerCounts] = await Promise.all([
        prisma.user.findMany({
            include: {
                teamMemberships: {
                    include: {
                        team: true
                    }
                }
            },
            where: {
                AND: [
                    query
                        ? {
                            OR: [
                                { name: { contains: query, mode: 'insensitive' } },
                                { email: { contains: query, mode: 'insensitive' } }
                            ]
                        }
                        : {},
                    statusFilter ? { status: statusFilter as any } : {},
                    roleFilter ? { role: roleFilter as any } : {},
                    teamFilter ? { teamMemberships: { some: { teamId: teamFilter } } } : {}
                ]
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.auditLog.findMany({
            include: {
                actor: true
            },
            where: {
                entityType: {
                    in: ['USER', 'TEAM', 'TEAM_MEMBER']
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 6
        }),
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

    const stats = {
        total: users.length,
        active: users.filter((u) => u.status === 'ACTIVE').length,
        invited: users.filter((u) => u.status === 'INVITED').length,
        disabled: users.filter((u) => u.status === 'DISABLED').length
    };

    const heroStats = [
        { label: 'Total', value: stats.total },
        { label: 'Active', value: stats.active },
        { label: 'Invited', value: stats.invited },
        { label: 'Disabled', value: stats.disabled }
    ];

    return (
        <div className="users-page-shell">
            <div className="users-page-container">
                <section className="users-hero">
                    <div className="users-hero-text">
                        <p className="hero-eyebrow">RESPONDERS & ACCESS</p>
                        <h1>Users</h1>
                        <p className="hero-subtitle">
                            Control who can see incidents, join teams, and receive notifications. Adjust filters to
                            find a responder or role quickly.
                        </p>
                    </div>
                    <div className="hero-stats">
                        {heroStats.map((stat) => (
                            <div key={stat.label} className="stats-card">
                                <span className="stats-label">{stat.label}</span>
                                <span className="stats-value">{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="users-main-grid">
                    <div className="users-left-column">
                        <div className="panel filters-panel">
                            <div className="panel-heading">
                                <p className="panel-eyebrow">Filters</p>
                                <h2>Find responders quickly</h2>
                                <p className="muted-text">Search, filter, and refine who should receive alerts.</p>
                            </div>
                            <form method="get" className="filters-form">
                                <label className="filter-field">
                                    <span className="filter-label">Search</span>
                                    <input
                                        name="q"
                                        defaultValue={query}
                                        placeholder="Name or email"
                                        className="filter-input"
                                    />
                                </label>
                                <label className="filter-field">
                                    <span className="filter-label">Status</span>
                                    <select name="status" defaultValue={statusFilter || ''} className="filter-select">
                                        <option value="">All</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="DISABLED">Disabled</option>
                                        <option value="INVITED">Invited</option>
                                    </select>
                                </label>
                                <label className="filter-field">
                                    <span className="filter-label">Role</span>
                                    <select name="role" defaultValue={roleFilter || ''} className="filter-select">
                                        <option value="">All</option>
                                        <option value="ADMIN">Admin</option>
                                        <option value="RESPONDER">Responder</option>
                                        <option value="USER">User</option>
                                    </select>
                                </label>
                                <label className="filter-field">
                                    <span className="filter-label">Team</span>
                                    <select name="teamId" defaultValue={teamFilter || ''} className="filter-select">
                                        <option value="">All</option>
                                        {teams.map((team) => (
                                            <option key={team.id} value={team.id}>
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="filters-form-actions">
                                    <button type="submit" className="btn btn-primary btn-md">
                                        Apply
                                    </button>
                                    <a href="/users" className="btn btn-outline btn-md">
                                        Clear
                                    </a>
                                </div>
                            </form>
                            <div className="bulk-actions-section">
                                <div>
                                    <p className="panel-eyebrow">Bulk actions</p>
                                    <p className="muted-text">Select rows then trigger updates.</p>
                                </div>
                                <BulkUserActionsForm
                                    action={bulkUpdateUsers}
                                    formId="bulk-users-form"
                                    className="bulk-actions-form-inline"
                                />
                            </div>
                        </div>

                        <div className="panel table-panel">
                            <div className="panel-heading">
                                <div>
                                    <p className="panel-eyebrow">User directory</p>
                                    <h2>Team roles & status</h2>
                                </div>
                            </div>
                            <div className="table-wrapper">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                <span className="table-label">Select</span>
                                            </th>
                                            <th>
                                                <span className="table-label">User</span>
                                            </th>
                                            <th>
                                                <span className="table-label">Role</span>
                                            </th>
                                            <th>
                                                <span className="table-label">Status</span>
                                            </th>
                                            <th>
                                                <span className="table-label">Teams</span>
                                            </th>
                                            <th>
                                                <span className="table-label">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => {
                                            const updateRole = updateUserRole.bind(null, user.id);
                                            const deactivate = deactivateUser.bind(null, user.id);
                                            const reactivate = reactivateUser.bind(null, user.id);
                                            const removeUser = deleteUser.bind(null, user.id);
                                            const inviteUser = generateInvite.bind(null, user.id);
                                            const assignToTeam = addUserToTeam.bind(null, user.id);
                                            const availableTeams = teams.filter(
                                                (team) => !user.teamMemberships.some((member) => member.teamId === team.id)
                                            );
                                            const isSoleOwner = user.teamMemberships.some(
                                                (member) => member.role === "OWNER" && ownerCountByTeam.get(member.teamId) === 1
                                            );

                                            return (
                                                <tr key={user.id}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            name="userIds"
                                                            value={user.id}
                                                            form="bulk-users-form"
                                                            className="table-checkbox"
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="user-row-info">
                                                            <span className="user-row-name">{user.name}</span>
                                                            <span className="user-row-email">{user.email}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <form action={updateRole} className="role-form">
                                                            <select name="role" defaultValue={user.role} className="role-select">
                                                                <option value="ADMIN">Admin</option>
                                                                <option value="RESPONDER">Responder</option>
                                                                <option value="USER">User</option>
                                                            </select>
                                                            <button type="submit" className="btn btn-sm btn-secondary">
                                                                Save
                                                            </button>
                                                        </form>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill status-${user.status.toLowerCase()}`}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="team-pill-row">
                                                            {user.teamMemberships.length === 0 ? (
                                                                <span className="muted-text">Unassigned</span>
                                                            ) : (
                                                                user.teamMemberships.map((member) => (
                                                                    <span
                                                                        key={member.id}
                                                                        className={`team-pill ${
                                                                            member.role === "OWNER"
                                                                                ? "team-pill-owner"
                                                                                : member.role === "ADMIN"
                                                                                ? "team-pill-admin"
                                                                                : "team-pill-member"
                                                                        }`}
                                                                    >
                                                                        {member.team.name} ({member.role})
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                        {availableTeams.length > 0 && (
                                                            <form action={assignToTeam} className="assign-team-form">
                                                                <select name="teamId" defaultValue="" className="assign-select">
                                                                    <option value="" disabled>
                                                                        Assign team
                                                                    </option>
                                                                    {availableTeams.map((team) => (
                                                                        <option key={team.id} value={team.id}>
                                                                            {team.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <select name="role" defaultValue="MEMBER" className="assign-select">
                                                                    <option value="OWNER">Owner</option>
                                                                    <option value="ADMIN">Admin</option>
                                                                    <option value="MEMBER">Member</option>
                                                                </select>
                                                                <button type="submit" className="btn btn-sm btn-ghost">
                                                                    Add
                                                                </button>
                                                            </form>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="row-actions">
                                                            {user.status === "INVITED" && (
                                                                <InviteLinkButton action={inviteUser} className="invite-link-inline" />
                                                            )}
                                                            {user.status === "DISABLED" ? (
                                                                <form action={reactivate}>
                                                                    <button type="submit" className="btn btn-sm btn-primary">
                                                                        Reactivate
                                                                    </button>
                                                                </form>
                                                            ) : user.status === "INVITED" ? (
                                                                <form action={reactivate}>
                                                                    <button type="submit" className="btn btn-sm btn-primary">
                                                                        Activate
                                                                    </button>
                                                                </form>
                                                            ) : (
                                                                <form action={deactivate}>
                                                                    <button type="submit" className="btn btn-sm btn-danger">
                                                                        Deactivate
                                                                    </button>
                                                                </form>
                                                            )}
                                                            <DeleteUserButton
                                                                action={removeUser}
                                                                className={isSoleOwner ? "btn btn-sm btn-disabled" : "btn btn-sm btn-delete"}
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
                            </div>
                        </div>
                    </div>

                    <aside className="users-right-column">
                        <div className="panel invite-panel">
                            <div>
                                <p className="panel-eyebrow">Invite new user</p>
                                <h3>Secure invite link</h3>
                                <p className="muted-text">Add responders with a role and send a secure invite instantly.</p>
                            </div>
                            <UserCreateForm action={addUser} className="invite-form-card" />
                        </div>
                        <div className="panel audit-panel">
                            <div className="panel-heading">
                                <div>
                                    <p className="panel-eyebrow">Recent Access Changes</p>
                                    <p className="muted-text">Audit trail of who joined, reactivated, or was removed.</p>
                                </div>
                            </div>
                            <div className="audit-history">
                                {auditLogs.length === 0 ? (
                                    <p className="muted-text">No access activity yet.</p>
                                ) : (
                                    auditLogs.map((log) => (
                                        <article key={log.id} className="history-entry">
                                            <div className="history-action">{log.action}</div>
                                            <p className="history-meta">
                                                {new Date(log.createdAt).toLocaleString()} - {log.actor?.name || "System"}
                                            </p>
                                        </article>
                                    ))
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
