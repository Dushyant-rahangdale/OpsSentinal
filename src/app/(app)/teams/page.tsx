import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { addTeamMember, createTeam, deleteTeam, removeTeamMember, updateTeam, updateTeamMemberRole, updateTeamMemberNotifications } from './actions';
import TeamCreateForm from '@/components/TeamCreateForm';
import TeamCard from '@/components/TeamCard';
import Link from 'next/link';

type TeamsPageProps = {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

const TEAMS_PER_PAGE = 10;
const ACTIVITY_PER_PAGE = 5;

function buildPaginationUrl(baseParams: URLSearchParams, page: number): string {
    const params = new URLSearchParams(baseParams);
    params.set('page', page.toString());
    return `/teams?${params.toString()}`;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
        // Show all pages if total is less than max
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Always show first page
        pages.push(1);

        if (currentPage <= 4) {
            // Near the beginning: 1 2 3 4 5 ... last
            for (let i = 2; i <= 5; i++) {
                pages.push(i);
            }
            pages.push('...');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
            // Near the end: 1 ... (last-4) (last-3) (last-2) (last-1) last
            pages.push('...');
            for (let i = totalPages - 4; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // In the middle: 1 ... (current-1) current (current+1) ... last
            pages.push('...');
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                pages.push(i);
            }
            pages.push('...');
            pages.push(totalPages);
        }
    }

    return pages;
}

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
    const awaitedSearchParams = await searchParams;
    const query = typeof awaitedSearchParams?.q === 'string' ? awaitedSearchParams.q.trim() : '';
    const sortBy = typeof awaitedSearchParams?.sortBy === 'string' ? awaitedSearchParams.sortBy : 'createdAt';
    const sortOrder = typeof awaitedSearchParams?.sortOrder === 'string' ? awaitedSearchParams.sortOrder : 'desc';
    const minMembers = typeof awaitedSearchParams?.minMembers === 'string' ? Number(awaitedSearchParams.minMembers) : undefined;
    const minServices = typeof awaitedSearchParams?.minServices === 'string' ? Number(awaitedSearchParams.minServices) : undefined;
    const page = Math.max(1, Number(awaitedSearchParams?.page) || 1);
    const skip = (page - 1) * TEAMS_PER_PAGE;

    // Build where clause with filters
    const where: any = query
        ? {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        }
        : {};

    // Build orderBy
    let orderBy: any = { createdAt: 'desc' }; // Default: newest first
    if (sortBy === 'createdAt') {
        orderBy = { createdAt: sortOrder };
    } else if (sortBy === 'name') {
        orderBy = { name: sortOrder };
    } else {
        // For memberCount/serviceCount, we'll sort in memory after fetching
        orderBy = { createdAt: 'desc' };
    }

    const [allTeams, totalCount, users, ownerCounts] = await Promise.all([
        prisma.team.findMany({
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                status: true,
                                emailNotificationsEnabled: true,
                                smsNotificationsEnabled: true,
                                pushNotificationsEnabled: true,
                                whatsappNotificationsEnabled: true
                            }
                        }
                    },
                    orderBy: { role: 'asc' }
                },
                // teamLead relation - uncomment after running: npx prisma generate
                // teamLead: {
                //     select: {
                //         id: true,
                //         name: true,
                //         email: true
                //     }
                // },
                services: { select: { id: true, name: true } },
                _count: { select: { members: true, services: true } }
            },
            where,
            orderBy,
        }),
        prisma.team.count({ where }),
        prisma.user.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                status: true
            }
        }),
        prisma.teamMember.groupBy({
            by: ['teamId'],
            where: { role: 'OWNER' },
            _count: { _all: true }
        })
    ]);

    // Apply member/service count filters and sorting
    let filteredTeams = allTeams;

    if (minMembers !== undefined) {
        filteredTeams = filteredTeams.filter(team => team._count.members >= minMembers);
    }

    if (minServices !== undefined) {
        filteredTeams = filteredTeams.filter(team => team._count.services >= minServices);
    }

    // Sort by member/service count if needed
    if (sortBy === 'memberCount' || sortBy === 'serviceCount') {
        filteredTeams = [...filteredTeams].sort((a, b) => {
            const aCount = sortBy === 'memberCount' ? a._count.members : a._count.services;
            const bCount = sortBy === 'memberCount' ? b._count.members : b._count.services;
            return sortOrder === 'asc' ? aCount - bCount : bCount - aCount;
        });
    }

    // Apply pagination
    const teams = filteredTeams.slice(skip, skip + TEAMS_PER_PAGE);
    const adjustedTotalCount = filteredTeams.length;

    const ownerCountByTeam = new Map<string, number>();
    for (const entry of ownerCounts) {
        ownerCountByTeam.set(entry.teamId, entry._count._all);
    }

    // Get current user permissions
    let permissions;
    try {
        permissions = await getUserPermissions();
    } catch (error) {
        console.error('Error getting user permissions:', error);
        // Default to USER role if there's an error
        permissions = {
            id: '',
            role: 'USER' as const,
            isAdmin: false,
            isAdminOrResponder: false,
            isResponderOrAbove: false
        };
    }
    const canCreateTeam = permissions.isAdminOrResponder;
    const canUpdateTeam = permissions.isAdminOrResponder;
    const canDeleteTeam = permissions.isAdmin;
    const canManageMembers = permissions.isAdminOrResponder;
    const canAssignOwnerAdmin = permissions.isAdmin;

    const totalPages = Math.ceil(adjustedTotalCount / TEAMS_PER_PAGE);
    const pageNumbers = totalPages > 1 ? getPageNumbers(page, totalPages) : [];
    const baseParams = new URLSearchParams();
    if (query) baseParams.set('q', query);
    if (sortBy !== 'createdAt') baseParams.set('sortBy', sortBy);
    if (sortOrder !== 'desc') baseParams.set('sortOrder', sortOrder);
    if (minMembers !== undefined) baseParams.set('minMembers', minMembers.toString());
    if (minServices !== undefined) baseParams.set('minServices', minServices.toString());

    // Fetch activity logs for each team
    const teamsWithActivity = await Promise.all(
        teams.map(async (team) => {
            try {
                const [activityLogs, activityTotal] = await Promise.all([
                    prisma.auditLog.findMany({
                        where: {
                            OR: [
                                { entityType: 'TEAM', entityId: team.id },
                                {
                                    entityType: 'TEAM_MEMBER',
                                    entityId: {
                                        not: null,
                                        startsWith: `${team.id}:`
                                    }
                                }
                            ]
                        },
                        include: {
                            actor: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: ACTIVITY_PER_PAGE
                    }),
                    prisma.auditLog.count({
                        where: {
                            OR: [
                                { entityType: 'TEAM', entityId: team.id },
                                {
                                    entityType: 'TEAM_MEMBER',
                                    entityId: {
                                        not: null,
                                        startsWith: `${team.id}:`
                                    }
                                }
                            ]
                        }
                    })
                ]);

                return { team, activityLogs, activityTotal };
            } catch (error) {
                // If activity log fetch fails, return empty logs
                console.error(`Error fetching activity logs for team ${team.id}:`, error);
                return { team, activityLogs: [], activityTotal: 0 };
            }
        })
    );

    return (
        <main style={{ padding: '1rem' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid var(--border)'
            }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Teams</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Manage ownership, roles, and service coverage. {adjustedTotalCount} {adjustedTotalCount === 1 ? 'team' : 'teams'} total.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link
                        href="/users"
                        className="glass-button"
                        style={{ textDecoration: 'none' }}
                    >
                        View Users
                    </Link>
                </div>
            </header>

            {/* Create Team Section */}
            {canCreateTeam ? (
                <div id="create-team" className="glass-panel" style={{
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--accent)' }}>Create Team</h2>
                    <TeamCreateForm action={createTeam} />
                </div>
            ) : (
                <div className="glass-panel" style={{
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    opacity: 0.7
                }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Create Team</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        ⚠️ You don't have access to create teams. Admin or Responder role required.
                    </p>
                    <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', opacity: 0.5, pointerEvents: 'none' }}>
                        <TeamCreateForm action={createTeam} />
                    </div>
                </div>
            )}

            {/* Advanced Search and Filters */}
            <div className="glass-panel" style={{
                padding: '1.5rem',
                marginBottom: '1.5rem',
                background: 'white',
                border: '1px solid #e2e8f0'
            }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>Search & Filters</h3>
                <form method="get" style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '500' }}>Search Teams</label>
                            <input
                                name="q"
                                defaultValue={query}
                                placeholder="Team name or description"
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 0.75rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '500' }}>Sort By</label>
                            <select
                                name="sortBy"
                                defaultValue={sortBy}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 0.75rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <option value="createdAt">Created Date</option>
                                <option value="name">Name</option>
                                <option value="memberCount">Member Count</option>
                                <option value="serviceCount">Service Count</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '500' }}>Order</label>
                            <select
                                name="sortOrder"
                                defaultValue={sortOrder}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 0.75rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <option value="desc">Newest First</option>
                                <option value="asc">Oldest First</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '500' }}>Min Members</label>
                            <input
                                type="number"
                                name="minMembers"
                                defaultValue={minMembers}
                                placeholder="Any"
                                min="0"
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 0.75rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '500' }}>Min Services</label>
                            <input
                                type="number"
                                name="minServices"
                                defaultValue={minServices}
                                placeholder="Any"
                                min="0"
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 0.75rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="submit" className="glass-button">Apply Filters</button>
                        <a href="/teams" className="glass-button" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                            Reset
                        </a>
                    </div>
                </form>
            </div>

            {/* Teams List */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {teams.length === 0 ? (
                    <div className="glass-panel empty-state" style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        background: 'white',
                        borderRadius: '12px'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>No teams found</p>
                        <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            {query || minMembers !== undefined || minServices !== undefined
                                ? 'Try adjusting your search criteria.'
                                : 'Create one above to start organizing responders and services.'}
                        </p>
                        {canCreateTeam && (
                            <a href="#create-team" className="glass-button primary" style={{ textDecoration: 'none' }}>
                                Create Your First Team
                            </a>
                        )}
                    </div>
                ) : teamsWithActivity.map(({ team, activityLogs, activityTotal }) => {
                    const availableUsers = users.filter((user) =>
                        !team.members.some((member) => member.userId === user.id) && user.status !== 'DISABLED'
                    );

                    const ownerCount = ownerCountByTeam.get(team.id) || 0;
                    const adminCount = team.members.filter(m => m.role === 'ADMIN').length;
                    const memberCount = team.members.length;
                    const canManageNotifications = permissions.isAdmin ||
                        team.members.some((member) => member.userId === permissions.id && member.role === 'OWNER') ||
                        (permissions.isAdminOrResponder && team.members.some((member) => member.userId === permissions.id));

                    return (
                        <TeamCard
                            key={team.id}
                            team={team}
                            teamId={team.id}
                            ownerCount={ownerCount}
                            adminCount={adminCount}
                            memberCount={memberCount}
                            availableUsers={availableUsers}
                            activityLogs={activityLogs}
                            activityTotal={activityTotal}
                            canUpdateTeam={canUpdateTeam}
                            canDeleteTeam={canDeleteTeam}
                            canManageMembers={canManageMembers}
                            canManageNotifications={canManageNotifications}
                            canAssignOwnerAdmin={canAssignOwnerAdmin}
                            updateTeam={updateTeam}
                            deleteTeam={deleteTeam}
                            addTeamMember={addTeamMember}
                            updateTeamMemberRole={updateTeamMemberRole}
                            updateTeamMemberNotifications={updateTeamMemberNotifications}
                            removeTeamMember={removeTeamMember}
                        />
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginTop: '2rem',
                    padding: '1.25rem 1.5rem',
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Showing {skip + 1}-{Math.min(skip + TEAMS_PER_PAGE, adjustedTotalCount)} of {adjustedTotalCount} teams
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
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

                        {/* Page Number Buttons */}
                        {pageNumbers.map((pageNum, index) => {
                            if (pageNum === '...') {
                                return (
                                    <span
                                        key={`ellipsis-${index}`}
                                        style={{
                                            padding: '0 0.25rem',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        ...
                                    </span>
                                );
                            }

                            const isActive = pageNum === page;
                            return (
                                <Link
                                    key={pageNum}
                                    href={buildPaginationUrl(baseParams, pageNum as number)}
                                    className={`glass-button ${isActive ? 'primary' : ''}`}
                                    style={{
                                        padding: '0.4rem 0.75rem',
                                        fontSize: '0.8rem',
                                        textDecoration: 'none',
                                        minWidth: '2.5rem',
                                        textAlign: 'center',
                                        background: isActive
                                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                            : undefined,
                                        color: isActive ? 'white' : undefined,
                                        border: isActive ? 'none' : undefined,
                                        fontWeight: isActive ? '600' : '500',
                                        boxShadow: isActive ? '0 2px 8px rgba(102, 126, 234, 0.3)' : undefined
                                    }}
                                >
                                    {String(pageNum)}
                                </Link>
                            );
                        })}

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
        </main>
    );
}
