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

function buildIncidentsUrl(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `/incidents?${query}` : '/incidents';
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    search?: string;
    priority?: string;
    urgency?: string;
    sort?: string;
    page?: string;
  }>;
}) {
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

  // Header stats (match users page: stat tiles + counts)
  const statsBase = {
    search: currentSearch,
    priority: currentPriority,
    urgency: currentUrgency,
    // "Mine" relies on assigneeId; fall back to permissions.id defensively
    assigneeId: currentUser?.id ?? permissions.id,
  };

  const [mineCount, openCount, resolvedCount, snoozedCount, suppressedCount] = await Promise.all([
    prisma.incident.count({ where: buildIncidentWhere({ filter: 'mine', ...statsBase }) }),
    prisma.incident.count({ where: buildIncidentWhere({ filter: 'all_open', ...statsBase }) }),
    prisma.incident.count({ where: buildIncidentWhere({ filter: 'resolved', ...statsBase }) }),
    prisma.incident.count({ where: buildIncidentWhere({ filter: 'snoozed', ...statsBase }) }),
    prisma.incident.count({ where: buildIncidentWhere({ filter: 'suppressed', ...statsBase }) }),
  ]);

  // Get total count for pagination
  const totalCount = await prisma.incident.count({ where });
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Get paginated incidents
  let incidents = await prisma.incident.findMany({
    where,
    select: incidentListSelect,
    orderBy,
    skip,
    take: ITEMS_PER_PAGE,
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
    orderBy: { name: 'asc' },
  });

  const tabs = [
    { id: 'mine', label: 'Mine', count: mineCount },
    { id: 'all_open', label: 'All Open', count: openCount },
    { id: 'resolved', label: 'Resolved', count: resolvedCount },
    { id: 'snoozed', label: 'Snoozed', count: snoozedCount },
    { id: 'suppressed', label: 'Suppressed', count: suppressedCount },
  ];

  const baseParams = new URLSearchParams();
  if (currentSearch) baseParams.set('search', currentSearch);
  if (currentPriority !== 'all') baseParams.set('priority', currentPriority);
  if (currentUrgency !== 'all') baseParams.set('urgency', currentUrgency);
  if (currentSort !== 'newest') baseParams.set('sort', currentSort);

  const showingFrom = totalCount === 0 ? 0 : skip + 1;
  const showingTo = Math.min(skip + ITEMS_PER_PAGE, totalCount);

  return (
    <main style={{ padding: '0 1rem 2rem' }}>
      {/* Hero Section (match Users page style) */}
      <div
        style={{
          background: 'var(--gradient-primary)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ minWidth: 240 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            Incidents
          </h1>
          <p style={{ opacity: 0.92, fontSize: '1rem', margin: 0 }}>
            Triage, assign, and resolve operational issues fast.
          </p>
          <p style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: '0.55rem', marginBottom: 0 }}>
            Showing{' '}
            <strong>
              {showingFrom}-{showingTo}
            </strong>{' '}
            of <strong>{totalCount}</strong> in this view
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {canCreateIncident ? (
            <Link
              href="/incidents/create"
              className="glass-button primary"
              style={{ textDecoration: 'none', whiteSpace: 'nowrap', padding: '0.5rem 0.9rem' }}
            >
              + Create Incident
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="glass-button primary"
              style={{
                textDecoration: 'none',
                opacity: 0.6,
                cursor: 'not-allowed',
                whiteSpace: 'nowrap',
                padding: '0.5rem 0.9rem',
              }}
              title="Responder role or above required to create incidents"
            >
              + Create Incident
            </button>
          )}
          <Link
            href="/"
            className="glass-button"
            style={{
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              background: 'rgba(255,255,255,0.14)',
              color: 'white',
              padding: '0.5rem 0.9rem',
            }}
          >
            Dashboard →
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            width: '100%',
          }}
        >
          <div
            className="glass-panel"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              padding: '0.8rem 0.9rem',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {mineCount}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                opacity: 0.9,
                marginTop: '0.2rem',
                letterSpacing: '0.04em',
              }}
            >
              MINE
            </div>
          </div>
          <div
            className="glass-panel"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              padding: '0.8rem 0.9rem',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {openCount}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                opacity: 0.9,
                marginTop: '0.2rem',
                letterSpacing: '0.04em',
              }}
            >
              OPEN
            </div>
          </div>
          <div
            className="glass-panel"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              padding: '0.8rem 0.9rem',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {resolvedCount}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                opacity: 0.9,
                marginTop: '0.2rem',
                letterSpacing: '0.04em',
              }}
            >
              RESOLVED
            </div>
          </div>
          <div
            className="glass-panel"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              padding: '0.8rem 0.9rem',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {snoozedCount}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                opacity: 0.9,
                marginTop: '0.2rem',
                letterSpacing: '0.04em',
              }}
            >
              SNOOZED
            </div>
          </div>
          <div
            className="glass-panel"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              padding: '0.8rem 0.9rem',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {suppressedCount}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                opacity: 0.9,
                marginTop: '0.2rem',
                letterSpacing: '0.04em',
              }}
            >
              SUPPRESSED
            </div>
          </div>
        </div>
      </div>

      {/* Tabs (pill-style, with counts) */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
        {tabs.map(tab => {
          const tabParams = new URLSearchParams(baseParams.toString());
          if (tab.id === 'all_open') {
            tabParams.delete('filter');
          } else {
            tabParams.set('filter', tab.id);
          }
          tabParams.delete('page');
          const isActive = currentFilter === tab.id;
          return (
            <Link
              key={tab.id}
              href={buildIncidentsUrl(tabParams)}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                textDecoration: 'none',
                background: isActive ? '#1e293b' : 'rgba(211, 47, 47, 0.1)',
                color: isActive ? 'white' : '#1e293b',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '0.08rem 0.45rem',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(211, 47, 47, 0.12)',
                  color: isActive ? 'white' : '#1e293b',
                  fontWeight: 800,
                }}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Filters Panel */}
      <div
        className="glass-panel"
        style={{ background: 'white', padding: '1rem 1.25rem', marginBottom: '1rem' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <p
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                fontWeight: 800,
                margin: 0,
              }}
            >
              Filters
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Refine the list and save presets.
            </p>
          </div>
          <PresetSelector presets={presets} currentCriteria={currentCriteria} />
        </div>

        <div style={{ marginTop: '0.75rem' }}>
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
          itemsPerPage: ITEMS_PER_PAGE,
        }}
      />
    </main>
  );
}
