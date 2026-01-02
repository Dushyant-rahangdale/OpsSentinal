import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getUserPermissions } from '@/lib/rbac';
import IncidentsListTable from '@/components/incident/IncidentsListTable';
import IncidentsFilters from '@/components/incident/IncidentsFilters';
import PresetSelector from '@/components/PresetSelector';
import { getAccessiblePresets, searchParamsToCriteria } from '@/lib/search-presets';
import { createDefaultPresetsForUser } from '@/lib/search-presets-defaults';
import {
    buildIncidentOrderBy,
    buildIncidentWhere,
    incidentListSelect,
    normalizeIncidentFilter,
    normalizeIncidentSort,
} from '@/lib/incidents-query';

export const revalidate = 30;

const ITEMS_PER_PAGE = 50; // Number of incidents per page

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ filter?: string; search?: string; priority?: string; urgency?: string; sort?: string; page?: string }> }) {
    const params = await searchParams;
    const currentFilter = normalizeIncidentFilter(params.filter);
    const currentSearch = params.search || '';
    const currentPriority = params.priority || 'all';
    const currentUrgency = params.urgency || 'all';
    const currentSort = normalizeIncidentSort(params.sort);
    const currentPage = parseInt(params.page || '1', 10);
    const skip = (currentPage - 1) * ITEMS_PER_PAGE;

    const permissions = await getUserPermissions();
    const canCreateIncident = permissions.isResponderOrAbove;

    // Get current user with team memberships in a single query (optimized)
    const currentUser = await prisma.user.findUnique({
        where: { id: permissions.id },
        select: {
            id: true,
            name: true,
            email: true,
            teamMemberships: {
                select: {
                    teamId: true,
                },
            },
        },
    });

    const userTeamIds = currentUser?.teamMemberships.map(t => t.teamId) || [];

    // Get accessible presets (and create defaults if needed)
    let presets = await getAccessiblePresets(permissions.id, userTeamIds);

    // Create default presets if user has none
    if (presets.length === 0 && permissions.isResponderOrAbove) {
        await createDefaultPresetsForUser(permissions.id);
        presets = await getAccessiblePresets(permissions.id, userTeamIds);
    }

    // Get current filter criteria
    const currentCriteria = searchParamsToCriteria({
        filter: currentFilter,
        search: currentSearch,
        priority: currentPriority,
        urgency: currentUrgency,
        sort: currentSort,
    });

    const where = buildIncidentWhere({
        filter: currentFilter,
        search: currentSearch,
        priority: currentPriority,
        urgency: currentUrgency,
        assigneeId: currentUser?.id,
    });

    const orderBy = buildIncidentOrderBy(currentSort);

    // Get total count for pagination
    const totalCount = await prisma.incident.count({ where });
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Get paginated incidents
    let incidents = await prisma.incident.findMany({
        where,
        select: incidentListSelect,
        orderBy,
        skip,
        take: ITEMS_PER_PAGE
    });

    // Custom priority sorting if needed (P1, P2, P3, P4, P5, null)
    // Note: For pagination, we should ideally do this at DB level, but for now we'll sort in memory
    if (currentSort === 'priority') {
        const priorityOrder = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, '': 6 };
        incidents = incidents.sort((a, b) => {
            const aPriorityKey = a.priority ?? '';
            const bPriorityKey = b.priority ?? '';
            const aPriority = priorityOrder[aPriorityKey as keyof typeof priorityOrder] || 6;
            const bPriority = priorityOrder[bPriorityKey as keyof typeof priorityOrder] || 6;
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }

    const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
    });

    const tabs = [
        { id: 'mine', label: 'Mine' },
        { id: 'all_open', label: 'All Open' },
        { id: 'resolved', label: 'Resolved' },
        { id: 'snoozed', label: 'Snoozed' },
        { id: 'suppressed', label: 'Suppressed' },
    ];

    return (
        <main>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Incidents</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Central command for all operative issues.</p>
                </div>
                {/* Create Incident Button - Top */}
                {canCreateIncident ? (
                    <Link href="/incidents/create" className="glass-button primary" style={{ textDecoration: 'none', borderRadius: '0px', whiteSpace: 'nowrap' }}>
                        + Create Incident
                    </Link>
                ) : (
                    <button
                        type="button"
                        disabled
                        className="glass-button primary"
                        style={{
                            textDecoration: 'none',
                            borderRadius: '0px',
                            opacity: 0.6,
                            cursor: 'not-allowed',
                            whiteSpace: 'nowrap'
                        }}
                        title="Responder role or above required to create incidents"
                    >
                        + Create Incident
                    </button>
                )}
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                {tabs.map(tab => (
                    <Link
                        key={tab.id}
                        href={`/incidents?filter=${tab.id}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ''}${currentPriority !== 'all' ? `&priority=${currentPriority}` : ''}${currentUrgency !== 'all' ? `&urgency=${currentUrgency}` : ''}${currentSort !== 'newest' ? `&sort=${currentSort}` : ''}`}
                        style={{
                            padding: '0.5rem 1rem',
                            color: currentFilter === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                            borderBottom: currentFilter === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                            fontWeight: currentFilter === tab.id ? 600 : 400,
                            textDecoration: 'none'
                        }}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>

            {/* Preset Selector & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)', flexWrap: 'wrap' }}>
                <PresetSelector
                    presets={presets}
                    currentCriteria={currentCriteria}
                />
                <div style={{ flex: 1 }}>
                    <IncidentsFilters
                        currentFilter={currentFilter}
                        currentSort={currentSort}
                        currentPriority={currentPriority}
                        currentUrgency={currentUrgency}
                        currentSearch={currentSearch}
                        currentCriteria={currentCriteria}
                    />
                </div>
            </div>

            <IncidentsListTable
                incidents={incidents}
                users={users}
                canManageIncidents={permissions.isResponderOrAbove}
                pagination={{
                    currentPage: currentPage,
                    totalPages: totalPages,
                    totalItems: totalCount,
                    itemsPerPage: ITEMS_PER_PAGE
                }}
            />
        </main>
    );
}
