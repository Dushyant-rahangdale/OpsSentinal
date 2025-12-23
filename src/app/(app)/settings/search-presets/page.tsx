import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { assertResponderOrAbove, getUserPermissions } from '@/lib/rbac';
import { getAccessiblePresets } from '@/lib/search-presets';
import prisma from '@/lib/prisma';
import SearchPresetManager from '@/components/SearchPresetManager';

export default async function SearchPresetsPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    try {
        await assertResponderOrAbove();
    } catch {
        redirect('/');
    }

    const permissions = await getUserPermissions();

    // Get user's teams
    const userTeams = await prisma.user.findUnique({
        where: { id: permissions.id },
        select: {
            teamMemberships: {
                select: {
                    teamId: true,
                },
            },
        },
    });

    const userTeamIds = userTeams?.teamMemberships.map(t => t.teamId) || [];

    const [presets, services, users, teams] = await Promise.all([
        getAccessiblePresets(permissions.id, userTeamIds),
        prisma.service.findMany({ orderBy: { name: 'asc' } }),
        prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        }),
        prisma.team.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return (
        <div style={{ padding: 'var(--spacing-6)' }}>
            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-2)' }}>
                    Search Presets
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-base)' }}>
                    Create and manage saved search filters for quick access to incidents
                </p>
            </div>

            <SearchPresetManager
                presets={presets}
                services={services}
                users={users}
                teams={teams}
                currentUserId={permissions.id}
                isAdmin={permissions.isAdmin}
            />
        </div>
    );
}

