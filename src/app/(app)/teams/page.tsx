import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPermissions } from '@/lib/rbac';
import { addTeamMember, createTeam, deleteTeam, removeTeamMember, updateTeam, updateTeamMemberRole } from './actions';
import TeamCreateForm from '@/components/TeamCreateForm';

type TeamsPageProps = {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
    const awaitedSearchParams = await searchParams;
    const query = typeof awaitedSearchParams?.q === 'string' ? awaitedSearchParams.q.trim() : '';

    const [teams, users, ownerCounts] = await Promise.all([
        prisma.team.findMany({
            include: {
                members: { include: { user: true } },
                services: { select: { id: true, name: true } },
                _count: { select: { members: true, services: true } }
            },
            where: query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } }
                    ]
                }
                : undefined,
            orderBy: { name: 'asc' }
        }),
        prisma.user.findMany({ orderBy: { name: 'asc' } }),
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

    // Get current user permissions
    const permissions = await getUserPermissions();
    const canCreateTeam = permissions.isAdminOrResponder;
    const canUpdateTeam = permissions.isAdminOrResponder;
    const canDeleteTeam = permissions.isAdmin;
    const canManageMembers = permissions.isAdminOrResponder;
    const canAssignOwnerAdmin = permissions.isAdmin;

    return (
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Teams</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage ownership, roles, and service coverage.</p>
                </div>
            </header>

            {canCreateTeam ? (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'white' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Create Team</h2>
                    <TeamCreateForm action={createTeam} />
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: '#f9fafb', border: '1px solid #e5e7eb', opacity: 0.7 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Create Team</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        ⚠️ You don't have access to create teams. Admin or Responder role required.
                    </p>
                    <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', opacity: 0.5, pointerEvents: 'none' }}>
                        <TeamCreateForm action={createTeam} />
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'white' }}>
                <form method="get" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '500' }}>Search Teams</label>
                        <input name="q" defaultValue={query} placeholder="Team name or description" style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="glass-button">Filter</button>
                        <a href="/teams" className="glass-button" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Reset</a>
                    </div>
                </form>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {teams.length === 0 ? (
                    <div className="glass-panel empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'white' }}>
                        No teams yet. Create one above to start organizing responders and services.
                    </div>
                ) : teams.map((team) => {
                    const updateTeamWithId = updateTeam.bind(null, team.id);
                    const deleteTeamWithId = deleteTeam.bind(null, team.id);
                    const addMemberWithId = addTeamMember.bind(null, team.id);

                    const availableUsers = users.filter((user) => !team.members.some((member) => member.userId === user.id));

                    return (
                        <div key={team.id} className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.25rem' }}>{team.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{team.description || 'No description provided.'}</p>
                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <span>{team._count.members} members</span>
                                        <span>{team._count.services} services</span>
                                    </div>
                                </div>
                                {canDeleteTeam ? (
                                    <form action={deleteTeamWithId}>
                                        <button type="submit" style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
                                            Delete Team
                                        </button>
                                    </form>
                                ) : (
                                    <button type="button" disabled style={{ background: '#d1d5db', color: '#6b7280', border: 'none', padding: '0.5rem 1rem', borderRadius: '999px', cursor: 'not-allowed', fontWeight: '600', fontSize: '0.8rem', opacity: 0.6 }} title="Admin access required to delete teams">
                                        Delete Team
                                    </button>
                                )}
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                {canUpdateTeam ? (
                                    <form action={updateTeamWithId} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>Team Name</label>
                                            <input name="name" defaultValue={team.name} required style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>Description</label>
                                            <input name="description" defaultValue={team.description || ''} placeholder="Team mission" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                                        </div>
                                        <button type="submit" className="glass-button">Update</button>
                                    </form>
                                ) : (
                                    <div style={{ padding: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', opacity: 0.7 }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                            ⚠️ You don't have access to edit this team. Admin or Responder role required.
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end', opacity: 0.5, pointerEvents: 'none' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Team Name</label>
                                                <input name="name" defaultValue={team.name} disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px', background: '#f3f4f6' }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Description</label>
                                                <input name="description" defaultValue={team.description || ''} disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px', background: '#f3f4f6' }} />
                                            </div>
                                            <button type="button" disabled className="glass-button" style={{ opacity: 0.5 }}>Update</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Members</h4>
                                    {team.members.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No members assigned.</p>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                                            {team.members.map((member) => {
                                                const updateMemberRole = updateTeamMemberRole.bind(null, member.id);
                                                const removeMember = removeTeamMember.bind(null, member.id);
                                                const isSoleOwner = member.role === 'OWNER' && (ownerCountByTeam.get(team.id) || 0) === 1;

                                                return (
                                                    <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '10px' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '600' }}>{member.user.name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{member.user.email}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            {canManageMembers ? (
                                                                <>
                                                                    <form action={updateMemberRole} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                        <select 
                                                                            name="role" 
                                                                            defaultValue={member.role} 
                                                                            disabled={isSoleOwner || (!canAssignOwnerAdmin && (member.role === 'OWNER' || member.role === 'ADMIN'))}
                                                                            style={{ 
                                                                                padding: '0.4rem 0.6rem', 
                                                                                border: '1px solid var(--border)', 
                                                                                borderRadius: '6px',
                                                                                opacity: (isSoleOwner || (!canAssignOwnerAdmin && (member.role === 'OWNER' || member.role === 'ADMIN'))) ? 0.5 : 1,
                                                                                background: (isSoleOwner || (!canAssignOwnerAdmin && (member.role === 'OWNER' || member.role === 'ADMIN'))) ? '#f3f4f6' : 'white'
                                                                            }}
                                                                            title={
                                                                                isSoleOwner 
                                                                                    ? 'Cannot change role of last owner' 
                                                                                    : !canAssignOwnerAdmin && (member.role === 'OWNER' || member.role === 'ADMIN')
                                                                                    ? 'Only admins can change OWNER/ADMIN roles'
                                                                                    : undefined
                                                                            }
                                                                        >
                                                                            <option value="OWNER">Owner</option>
                                                                            <option value="ADMIN">Admin</option>
                                                                            <option value="MEMBER">Member</option>
                                                                        </select>
                                                                        <button 
                                                                            type="submit" 
                                                                            className="glass-button" 
                                                                            disabled={isSoleOwner || (!canAssignOwnerAdmin && (member.role === 'OWNER' || member.role === 'ADMIN'))}
                                                                            style={{ opacity: (isSoleOwner || (!canAssignOwnerAdmin && (member.role === 'OWNER' || member.role === 'ADMIN'))) ? 0.5 : 1 }}
                                                                        >
                                                                            Save
                                                                        </button>
                                                                    </form>
                                                                    <form action={removeMember}>
                                                                        <button 
                                                                            type="submit" 
                                                                            disabled={isSoleOwner} 
                                                                            title={isSoleOwner ? 'Reassign owner before removing.' : 'Remove member'} 
                                                                            style={{ 
                                                                                background: isSoleOwner ? '#fca5a5' : '#fee2e2', 
                                                                                color: 'var(--danger)', 
                                                                                border: 'none', 
                                                                                padding: '0.4rem 0.75rem', 
                                                                                borderRadius: '999px', 
                                                                                cursor: isSoleOwner ? 'not-allowed' : 'pointer', 
                                                                                fontWeight: '600', 
                                                                                fontSize: '0.75rem',
                                                                                opacity: isSoleOwner ? 0.6 : 1
                                                                            }}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </form>
                                                                </>
                                                            ) : (
                                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: 0.6 }}>
                                                                    <select 
                                                                        disabled 
                                                                        defaultValue={member.role}
                                                                        style={{ 
                                                                            padding: '0.4rem 0.6rem', 
                                                                            border: '1px solid var(--border)', 
                                                                            borderRadius: '6px',
                                                                            background: '#f3f4f6',
                                                                            color: 'var(--text-secondary)'
                                                                        }}
                                                                    >
                                                                        <option value="OWNER">Owner</option>
                                                                        <option value="ADMIN">Admin</option>
                                                                        <option value="MEMBER">Member</option>
                                                                    </select>
                                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                                        ⚠️ No edit access
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {isSoleOwner && (
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last owner</span>
                                                            )}
                                                            {!canAssignOwnerAdmin && (member.role === 'OWNER' || member.role === 'ADMIN') && (
                                                                <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '500' }}>
                                                                    ⚠️ Admin required
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Add Member</h4>
                                    {canManageMembers ? (
                                        <form action={addMemberWithId} style={{ display: 'grid', gap: '0.75rem' }}>
                                            <select name="userId" style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                                                <option value="">Select user</option>
                                                {availableUsers.map((user) => (
                                                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                                ))}
                                            </select>
                                            <select 
                                                name="role" 
                                                defaultValue="MEMBER" 
                                                style={{ 
                                                    padding: '0.6rem', 
                                                    border: '1px solid var(--border)', 
                                                    borderRadius: '6px',
                                                    opacity: !canAssignOwnerAdmin ? 0.7 : 1
                                                }}
                                                disabled={!canAssignOwnerAdmin}
                                                title={!canAssignOwnerAdmin ? 'Only admins can assign OWNER or ADMIN roles' : undefined}
                                            >
                                                <option value="OWNER" disabled={!canAssignOwnerAdmin}>Owner{!canAssignOwnerAdmin ? ' (Admin only)' : ''}</option>
                                                <option value="ADMIN" disabled={!canAssignOwnerAdmin}>Admin{!canAssignOwnerAdmin ? ' (Admin only)' : ''}</option>
                                                <option value="MEMBER">Member</option>
                                            </select>
                                            <button type="submit" className="glass-button primary" disabled={availableUsers.length === 0}>
                                                Add to Team
                                            </button>
                                            {availableUsers.length === 0 && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All users are already members.</p>
                                            )}
                                            {!canAssignOwnerAdmin && (
                                                <p style={{ fontSize: '0.75rem', color: '#dc2626', fontStyle: 'italic', marginTop: '-0.5rem' }}>
                                                    ⚠️ Only admins can assign OWNER or ADMIN roles
                                                </p>
                                            )}
                                        </form>
                                    ) : (
                                        <div style={{ padding: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', opacity: 0.7 }}>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                                ⚠️ You don't have access to add team members. Admin or Responder role required.
                                            </p>
                                            <div style={{ display: 'grid', gap: '0.75rem', opacity: 0.5, pointerEvents: 'none' }}>
                                                <select disabled style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px', background: '#f3f4f6' }}>
                                                    <option value="">Select user</option>
                                                </select>
                                                <select disabled defaultValue="MEMBER" style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px', background: '#f3f4f6' }}>
                                                    <option value="MEMBER">Member</option>
                                                </select>
                                                <button type="button" disabled className="glass-button primary" style={{ opacity: 0.5 }}>
                                                    Add to Team
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '1.5rem' }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Owned Services</h4>
                                        {team.services.length === 0 ? (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No services assigned.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                                                {team.services.map((service) => (
                                                    <span key={service.id} style={{ padding: '0.35rem 0.6rem', borderRadius: '999px', background: '#fef2f2', color: 'var(--primary)' }}>
                                                        {service.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
