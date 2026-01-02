import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import DashboardFilters from '@/components/DashboardFilters';
import IncidentTable from '@/components/IncidentTable';
import DashboardPerformanceMetrics from '@/components/DashboardPerformanceMetrics';
import DashboardQuickFilters from '@/components/DashboardQuickFilters';
import DashboardFilterChips from '@/components/DashboardFilterChips';
import DashboardAdvancedMetrics from '@/components/DashboardAdvancedMetrics';
import DashboardSavedFilters from '@/components/DashboardSavedFilters';
import DashboardPeriodComparison from '@/components/DashboardPeriodComparison';
import DashboardServiceHealth from '@/components/DashboardServiceHealth';
import DashboardUrgencyDistribution from '@/components/DashboardUrgencyDistribution';

import { calculateSLAMetrics } from '@/lib/sla-server';
import { Suspense } from 'react';
import DashboardRealtimeWrapper from '@/components/DashboardRealtimeWrapper';
import DashboardCommandCenter from '@/components/dashboard/DashboardCommandCenter';
import QuickActionsPanel from '@/components/dashboard/QuickActionsPanel';
import OnCallWidget from '@/components/dashboard/OnCallWidget';
import SidebarWidget, {
  WIDGET_ICON_BG,
  WIDGET_ICON_COLOR,
} from '@/components/dashboard/SidebarWidget';
import styles from '@/components/dashboard/Dashboard.module.css';
import {
  buildDateFilter,
  buildIncidentWhere,
  buildIncidentOrderBy,
  getDaysFromRange,
  getRangeLabel,
  type DashboardFilters as DashboardFilterParams,
} from '@/lib/dashboard-utils';

export const revalidate = 30;

const INCIDENTS_PER_PAGE = 30;

function buildPaginationUrl(baseParams: URLSearchParams, page: number): string {
  const params = new URLSearchParams(baseParams.toString());
  if (page === 1) {
    params.delete('page');
  } else {
    params.set('page', page.toString());
  }
  const queryString = params.toString();
  return queryString ? `/?${queryString}` : '/';
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(await getAuthOptions());
  const awaitedSearchParams = await searchParams;

  // Extract search params
  const status =
    typeof awaitedSearchParams.status === 'string' ? awaitedSearchParams.status : undefined;
  const assignee =
    typeof awaitedSearchParams.assignee === 'string' ? awaitedSearchParams.assignee : undefined;
  const service =
    typeof awaitedSearchParams.service === 'string' ? awaitedSearchParams.service : undefined;
  const urgencyParam =
    typeof awaitedSearchParams.urgency === 'string' ? awaitedSearchParams.urgency : undefined;
  const urgency = (
    ['HIGH', 'MEDIUM', 'LOW'].includes(urgencyParam || '') ? urgencyParam : undefined
  ) as 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
  const page =
    typeof awaitedSearchParams.page === 'string' ? parseInt(awaitedSearchParams.page) || 1 : 1;
  const sortBy =
    typeof awaitedSearchParams.sortBy === 'string' ? awaitedSearchParams.sortBy : 'createdAt';
  const sortOrder =
    typeof awaitedSearchParams.sortOrder === 'string'
      ? (awaitedSearchParams.sortOrder as 'asc' | 'desc')
      : 'desc';
  const range = typeof awaitedSearchParams.range === 'string' ? awaitedSearchParams.range : '30';
  const customStart =
    typeof awaitedSearchParams.startDate === 'string' ? awaitedSearchParams.startDate : undefined;
  const customEnd =
    typeof awaitedSearchParams.endDate === 'string' ? awaitedSearchParams.endDate : undefined;

  // Get user name for greeting
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { name: true },
      })
    : null;
  const userName = user?.name || 'there';

  // Build filters using utility functions
  const filterParams: DashboardFilterParams = {
    status,
    service,
    assignee,
    urgency,
    range,
    customStart,
    customEnd,
  };

  // Main query where clause (includes status filter)
  const where = buildIncidentWhere(filterParams);

  // Metrics where clause (excludes status filter for aggregate counts)
  const metricsWhere = buildIncidentWhere(filterParams, { includeStatus: false });

  // Chart where clause (excludes urgency for distribution charts)
  const chartWhere = buildIncidentWhere(filterParams, {
    includeStatus: false,
    includeUrgency: false,
  });

  // MTTA where clause
  const mttaWhere = { ...metricsWhere, acknowledgedAt: { not: null } };

  // Date filter for SLA calculations
  const dateFilter = buildDateFilter(range, customStart, customEnd);
  const metricsStartDate = dateFilter.createdAt?.gte;
  const metricsEndDate = dateFilter.createdAt?.lte;
  const assigneeFilter = assignee !== undefined ? (assignee === '' ? null : assignee) : undefined;

  // Build orderBy using utility function
  const orderBy = buildIncidentOrderBy(sortBy, sortOrder);

  const skip = (page - 1) * INCIDENTS_PER_PAGE;

  // Fetch Data in Parallel
  const [
    incidents,
    totalCount,
    services,
    users,
    activeShifts,
    urgencyGroupCounts,
    metricsResolvedCount,
    allOpenIncidentsCount,
    allAcknowledgedCount,
    allCriticalIncidentsCount,
    unassignedCount,
    allIncidentsCount,
    allResolvedCountAllTime,
    slaMetrics,
    // MTTA calculation - optimized to only fetch what we need
    acknowledgedIncidentsForMTTA,
    metricsTotalCount,
    metricsOpenCount,
    // Current period metrics - moved into parallel batch
    currentPeriodAcknowledged,
    currentPeriodCritical,
  ] = await Promise.all([
    prisma.incident.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        urgency: true,
        createdAt: true,
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy,
      skip,
      take: INCIDENTS_PER_PAGE,
    }),
    prisma.incident.count({ where }),
    // Optimized: Only fetch id and name for services (used in filters and service health)
    prisma.service.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
    // Optimized: Only fetch id and name for users (used in filters)
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.onCallShift.findMany({
      where: {
        start: { lte: new Date() },
        end: { gte: new Date() },
      },
      include: { user: true, schedule: true },
    }),
    prisma.incident.groupBy({
      by: ['urgency'],
      where: chartWhere,
      _count: { _all: true },
    }),
    prisma.incident.count({
      where: {
        status: 'RESOLVED',
        ...metricsWhere,
      },
    }),
    // All-time counts (for Command Center and Advanced Metrics)
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
      },
    }),
    prisma.incident.count({
      where: {
        status: 'ACKNOWLEDGED',
      },
    }),
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
        urgency: 'HIGH',
      },
    }),
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
        assigneeId: null,
      },
    }),
    prisma.incident.count({}),
    prisma.incident.count({
      where: {
        status: 'RESOLVED',
      },
    }),
    calculateSLAMetrics({
      serviceId: service,
      assigneeId: assigneeFilter,
      urgency: urgency as 'HIGH' | 'MEDIUM' | 'LOW' | undefined,
      startDate: metricsStartDate,
      endDate: metricsEndDate,
      includeAllTime: range === 'all',
    }),
    // Optimized MTTA: Only fetch timestamps we need, limit to reasonable amount
    prisma.incident.findMany({
      where: mttaWhere,
      select: {
        createdAt: true,
        acknowledgedAt: true,
      },
      take: 500, // Limit for performance - MTTA doesn't need all incidents
    }),
    prisma.incident.count({
      where: metricsWhere,
    }),
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
        ...metricsWhere,
      },
    }),
    prisma.incident.count({
      where: {
        status: 'ACKNOWLEDGED',
        ...metricsWhere,
      },
    }),
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
        urgency: 'HIGH',
        ...metricsWhere,
      },
    }),
  ]);

  // Calculate MTTA
  const acknowledgedIncidents = acknowledgedIncidentsForMTTA;

  let mttaMinutes: number | null = null;
  if (acknowledgedIncidents.length > 0) {
    const ackTimes = acknowledgedIncidents
      .filter(i => i.acknowledgedAt && i.createdAt)
      .map(i => {
        const created = i.createdAt.getTime();
        const acked = i.acknowledgedAt!.getTime();
        return (acked - created) / (1000 * 60);
      });

    if (ackTimes.length > 0) {
      mttaMinutes = ackTimes.reduce((sum, time) => sum + time, 0) / ackTimes.length;
    }
  }

  // Calculate urgency distribution
  const urgencyCounts = urgencyGroupCounts.reduce(
    (acc, item) => {
      acc[item.urgency] = item._count._all;
      return acc;
    },
    {} as Record<string, number>
  );

  const urgencyDistribution = [
    { label: 'High', value: urgencyCounts['HIGH'] || 0, color: 'var(--color-danger)' },
    { label: 'Medium', value: urgencyCounts['MEDIUM'] || 0, color: '#f59e0b' },
    { label: 'Low', value: urgencyCounts['LOW'] || 0, color: '#22c55e' },
  ].filter(item => item.value > 0);

  // Calculate previous period data for comparison
  const currentPeriodDays = getDaysFromRange(range);
  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - currentPeriodDays * 2);
  const previousPeriodEnd = new Date();
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - currentPeriodDays);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previousPeriodWhere: any = {
    createdAt: {
      gte: previousPeriodStart,
      lt: previousPeriodEnd,
    },
  };
  if (assignee !== undefined) {
    if (assignee === '') {
      previousPeriodWhere.assigneeId = null;
    } else {
      previousPeriodWhere.assigneeId = assignee;
    }
  }
  if (service) previousPeriodWhere.serviceId = service;
  if (urgency) previousPeriodWhere.urgency = urgency;

  const previousPeriodIncidents =
    currentPeriodDays > 0
      ? await Promise.all([
          prisma.incident.count({
            where: {
              ...previousPeriodWhere,
            },
          }),
          prisma.incident.count({
            where: {
              status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
              ...previousPeriodWhere,
            },
          }),
          prisma.incident.count({
            where: {
              status: 'RESOLVED',
              ...previousPeriodWhere,
            },
          }),
          prisma.incident.count({
            where: {
              status: 'ACKNOWLEDGED',
              ...previousPeriodWhere,
            },
          }),
          prisma.incident.count({
            where: {
              status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
              urgency: 'HIGH',
              ...previousPeriodWhere,
            },
          }),
        ])
      : [0, 0, 0, 0, 0];

  const [prevTotal, prevOpen, prevResolved, prevAcknowledged, prevCritical] =
    previousPeriodIncidents;

  // Get service health data - Optimized: Use groupBy to avoid N+1 queries
  const serviceIds = services.map(s => s.id);

  // Fetch counts for all services at once using aggregation
  const [serviceActiveCounts, serviceCriticalCounts] = await Promise.all([
    serviceIds.length > 0
      ? prisma.incident.groupBy({
          by: ['serviceId'],
          where: {
            serviceId: { in: serviceIds },
            status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
          },
          _count: { _all: true },
        })
      : [],
    serviceIds.length > 0
      ? prisma.incident.groupBy({
          by: ['serviceId'],
          where: {
            serviceId: { in: serviceIds },
            status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
            urgency: 'HIGH',
          },
          _count: { _all: true },
        })
      : [],
  ]);

  // Create maps for O(1) lookup
  const activeCountMap = new Map(
    serviceActiveCounts.map(item => [item.serviceId, item._count._all])
  );
  const criticalCountMap = new Map(
    serviceCriticalCounts.map(item => [item.serviceId, item._count._all])
  );

  // Build service health array
  const servicesWithIncidents = services.map(service => ({
    id: service.id,
    name: service.name,
    status: service.status,
    activeIncidents: activeCountMap.get(service.id) || 0,
    criticalIncidents: criticalCountMap.get(service.id) || 0,
  }));

  // Helper functions for period labels
  const getPeriodLabels = () => {
    if (range === 'all') return { current: 'All Time', previous: 'All Time' };
    const days = getDaysFromRange(range);
    if (days === 0) return { current: 'All Time', previous: 'All Time' };

    return {
      current: `Last ${days} days`,
      previous: `Previous ${days} days`,
    };
  };

  const periodLabels = getPeriodLabels();

  // Calculate system status
  const systemStatus =
    allCriticalIncidentsCount > 0
      ? { label: 'CRITICAL', color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.1)' }
      : allOpenIncidentsCount > 0
        ? { label: 'DEGRADED', color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)' }
        : { label: 'OPERATIONAL', color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.1)' };

  const totalPages = Math.ceil(totalCount / INCIDENTS_PER_PAGE);
  const baseParams = new URLSearchParams();
  if (status && status !== 'ALL') baseParams.set('status', status);
  if (assignee !== undefined) baseParams.set('assignee', assignee);
  if (service) baseParams.set('service', service);
  if (urgency) baseParams.set('urgency', urgency);
  if (range && range !== 'all') baseParams.set('range', range);
  if (customStart) baseParams.set('startDate', customStart);
  if (customEnd) baseParams.set('endDate', customEnd);
  if (sortBy !== 'createdAt' || sortOrder !== 'desc') {
    baseParams.set('sortBy', sortBy);
    baseParams.set('sortOrder', sortOrder);
  }

  // Get greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  // Calculate total incidents for the selected range
  const totalInRange = metricsTotalCount;

  return (
    <DashboardRealtimeWrapper>
      <main style={{ paddingBottom: '2rem' }}>
        <DashboardCommandCenter
          systemStatus={systemStatus}
          allOpenIncidentsCount={allOpenIncidentsCount}
          totalInRange={totalInRange}
          metricsOpenCount={metricsOpenCount}
          metricsResolvedCount={metricsResolvedCount}
          unassignedCount={unassignedCount}
          rangeLabel={getRangeLabel(range)}
          incidents={incidents}
          filters={{
            status: status || undefined,
            service: service || undefined,
            assignee: assignee || undefined,
            range: range !== 'all' ? range : undefined,
          }}
          currentPeriodAcknowledged={currentPeriodAcknowledged}
        />

        {/* Main Content Grid - Two Column Layout (matching users page) */}
        <div className={styles.mainGrid}>
          {/* Left Column - Filters and Table */}
          <div className={styles.leftColumn}>
            {/* Filters Panel - Defined in globals.css */}
            <div className={`glass-panel ${styles.filtersPanel}`}>
              <div className={styles.filtersHeader}>
                <div className={styles.filtersIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-primary)"
                    strokeWidth="2"
                  >
                    <path
                      d="M3 6l3 3m0 0l3-3m-3 3v12m6-9h6m-6 3h6m-6 3h6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                  Filter Incidents
                </h2>
              </div>

              {/* Saved Filters */}
              <div style={{ marginBottom: '1rem' }}>
                <Suspense
                  fallback={
                    <div
                      style={{
                        height: '32px',
                        background: 'var(--color-neutral-200)',
                        borderRadius: 'var(--radius-md)',
                        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                        width: '200px',
                      }}
                    />
                  }
                >
                  <DashboardSavedFilters />
                </Suspense>
              </div>

              {/* Quick Filters */}
              <div style={{ marginBottom: '1rem' }}>
                <Suspense
                  fallback={
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--spacing-2)',
                        height: '40px',
                      }}
                    >
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: '40px',
                            background: 'var(--color-neutral-200)',
                            borderRadius: 'var(--radius-md)',
                            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                          }}
                        />
                      ))}
                    </div>
                  }
                >
                  <DashboardQuickFilters />
                </Suspense>
              </div>

              {/* Filter Chips */}
              <Suspense
                fallback={
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--spacing-2)',
                      flexWrap: 'wrap',
                      minHeight: '40px',
                    }}
                  >
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        style={{
                          width: '80px',
                          height: '28px',
                          background: 'var(--color-neutral-200)',
                          borderRadius: 'var(--radius-full)',
                          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                        }}
                      />
                    ))}
                  </div>
                }
              >
                <DashboardFilterChips services={services} users={users} />
              </Suspense>

              {/* Dashboard Filters */}
              <div style={{ marginTop: '1rem' }}>
                <DashboardFilters
                  initialStatus={status}
                  initialService={service}
                  initialAssignee={assignee}
                  services={services}
                  users={users}
                />
              </div>
            </div>

            {/* Incidents Table Panel - Use the defined glass-panel and add animation */}
            <div
              className="glass-panel animate-slide-up"
              style={{ padding: '0', overflow: 'hidden' }}
            >
              <div
                style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background:
                        'linear-gradient(135deg, rgba(30, 41, 59, 0.05) 0%, rgba(51, 65, 85, 0.05) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-primary)"
                      strokeWidth="2"
                    >
                      <path
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.2rem 0' }}>
                      Incident Directory
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Showing {skip + 1}-{Math.min(skip + INCIDENTS_PER_PAGE, totalCount)} of{' '}
                      {totalCount} incidents
                    </p>
                  </div>
                </div>
                <Link
                  href="/incidents"
                  className="dashboard-view-all-link"
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    background: 'white',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  View All <span>→</span>
                </Link>
              </div>

              <div
                className="incident-table-scroll"
                style={{
                  overflowX: 'auto',
                }}
              >
                {incidents.length === 0 ? (
                  <div
                    style={{
                      padding: '4rem 2rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                      borderTop: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ opacity: 0.3, margin: '0 auto 1rem' }}
                    >
                      <path
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p
                      style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      No incidents found
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Try adjusting your filters to see more results.
                    </p>
                  </div>
                ) : (
                  <IncidentTable incidents={incidents} sortBy={sortBy} sortOrder={sortOrder} />
                )}
              </div>

              {/* Pagination - Enhanced style */}
              {totalPages > 1 && (
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    background: 'linear-gradient(135deg, #fafbfc 0%, #ffffff 100%)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      fontWeight: '500',
                    }}
                  >
                    Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Link
                      href={buildPaginationUrl(baseParams, 1)}
                      className={`glass-button ${page === 1 ? 'disabled' : ''}`}
                      style={{
                        padding: '0.5rem 0.9rem',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        opacity: page === 1 ? 0.4 : 1,
                        pointerEvents: page === 1 ? 'none' : 'auto',
                        borderRadius: '8px',
                        fontWeight: '600',
                      }}
                    >
                      First
                    </Link>
                    <Link
                      href={buildPaginationUrl(baseParams, Math.max(1, page - 1))}
                      className={`glass-button ${page === 1 ? 'disabled' : ''}`}
                      style={{
                        padding: '0.5rem 0.9rem',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        opacity: page === 1 ? 0.4 : 1,
                        pointerEvents: page === 1 ? 'none' : 'auto',
                        borderRadius: '8px',
                        fontWeight: '600',
                      }}
                    >
                      Previous
                    </Link>
                    <Link
                      href={buildPaginationUrl(baseParams, Math.min(totalPages, page + 1))}
                      className={`glass-button ${page === totalPages ? 'disabled' : ''}`}
                      style={{
                        padding: '0.5rem 0.9rem',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        opacity: page === totalPages ? 0.4 : 1,
                        pointerEvents: page === totalPages ? 'none' : 'auto',
                        borderRadius: '8px',
                        fontWeight: '600',
                      }}
                    >
                      Next
                    </Link>
                    <Link
                      href={buildPaginationUrl(baseParams, totalPages)}
                      className={`glass-button ${page === totalPages ? 'disabled' : ''}`}
                      style={{
                        padding: '0.5rem 0.9rem',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        opacity: page === totalPages ? 0.4 : 1,
                        pointerEvents: page === totalPages ? 'none' : 'auto',
                        borderRadius: '8px',
                        fontWeight: '600',
                      }}
                    >
                      Last
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - All Widgets (matching users page style) */}
          <aside
            className="dashboard-sidebar animate-slide-in-right"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* Quick Actions Panel */}
            <QuickActionsPanel greeting={greeting} userName={userName} />

            {/* On-Call Widget */}
            <OnCallWidget activeShifts={activeShifts} />

            {/* Performance Metrics Widget */}
            <SidebarWidget
              title="Performance Metrics"
              iconBg={WIDGET_ICON_BG.green}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={WIDGET_ICON_COLOR.green}
                  strokeWidth="2"
                >
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              <DashboardPerformanceMetrics
                mtta={mttaMinutes}
                mttr={slaMetrics.mttr}
                ackSlaRate={slaMetrics.ackCompliance}
                resolveSlaRate={slaMetrics.resolveCompliance}
              />
            </SidebarWidget>

            {/* Advanced Metrics */}
            <SidebarWidget
              title="Advanced Metrics"
              iconBg={WIDGET_ICON_BG.blue}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={WIDGET_ICON_COLOR.blue}
                  strokeWidth="2"
                >
                  <path
                    d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              <DashboardAdvancedMetrics
                totalIncidents={allIncidentsCount}
                openIncidents={allOpenIncidentsCount}
                resolvedIncidents={allResolvedCountAllTime}
                acknowledgedIncidents={allAcknowledgedCount}
                criticalIncidents={allCriticalIncidentsCount}
                unassignedIncidents={unassignedCount}
                servicesCount={services.length}
              />
            </SidebarWidget>

            {/* Period Comparison Widget */}
            <SidebarWidget
              title="Period Comparison"
              iconBg={WIDGET_ICON_BG.orange}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={WIDGET_ICON_COLOR.orange}
                  strokeWidth="2"
                >
                  <path
                    d="M3 3v18h18M7 16l4-4 4 4 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              <DashboardPeriodComparison
                current={{
                  total: totalInRange,
                  open: metricsOpenCount,
                  resolved: metricsResolvedCount,
                  acknowledged: currentPeriodAcknowledged,
                  critical: currentPeriodCritical,
                }}
                previous={{
                  total: prevTotal,
                  open: prevOpen,
                  resolved: prevResolved,
                  acknowledged: prevAcknowledged,
                  critical: prevCritical,
                }}
                periodLabel={periodLabels.current}
                previousPeriodLabel={periodLabels.previous}
              />
            </SidebarWidget>

            {/* Service Health Widget */}
            <SidebarWidget
              title="Service Health"
              iconBg={WIDGET_ICON_BG.green}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={WIDGET_ICON_COLOR.green}
                  strokeWidth="2"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              <DashboardServiceHealth services={servicesWithIncidents} />
            </SidebarWidget>

            {/* Urgency Distribution Widget */}
            <SidebarWidget
              title="Urgency Distribution"
              iconBg={WIDGET_ICON_BG.red}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={WIDGET_ICON_COLOR.red}
                  strokeWidth="2"
                >
                  <path
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              <DashboardUrgencyDistribution data={urgencyDistribution} />
            </SidebarWidget>
          </aside>
        </div>
      </main>
    </DashboardRealtimeWrapper>
  );
}
