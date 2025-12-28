import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { assertResponderOrAbove, getUserPermissions } from '@/lib/rbac';
import { getAccessiblePresets } from '@/lib/search-presets';
import prisma from '@/lib/prisma';
import SearchPresetManager from '@/components/SearchPresetManager';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';

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
        <SettingsPage
            currentPageId="search-presets"
            backHref="/settings"
            title="Search Presets"
            description="Create and manage saved search filters for quick access to incidents."
        >
            <SettingsSectionCard
                title="Saved searches"
                description="Build filters you can reuse across incident views."
            >
                <SearchPresetManager
                    presets={presets}
                    services={services}
                    users={users}
                    teams={teams}
                    currentUserId={permissions.id}
                    isAdmin={permissions.isAdmin}
                />
            </SettingsSectionCard>
        </SettingsPage>
    );
}


