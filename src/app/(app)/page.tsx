import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardFilters from '@/components/DashboardFilters';
import IncidentTable from '@/components/IncidentTable';
import DashboardPerformanceMetrics from '@/components/DashboardPerformanceMetrics';
import DashboardQuickFilters from '@/components/DashboardQuickFilters';
import DashboardTimeRange from '@/components/DashboardTimeRange';
import DashboardRefresh from '@/components/DashboardRefresh';
import DashboardExport from '@/components/DashboardExport';
import DashboardFilterChips from '@/components/DashboardFilterChips';
import DashboardAdvancedMetrics from '@/components/DashboardAdvancedMetrics';
import DashboardStatusChart from '@/components/DashboardStatusChart';
import DashboardSavedFilters from '@/components/DashboardSavedFilters';
import DashboardNotifications from '@/components/DashboardNotifications';
import DashboardPeriodComparison from '@/components/DashboardPeriodComparison';
import DashboardServiceHealth from '@/components/DashboardServiceHealth';
import DashboardUrgencyDistribution from '@/components/DashboardUrgencyDistribution';
import DashboardSLAMetrics from '@/components/DashboardSLAMetrics';
import { calculateSLAMetrics } from '@/lib/sla';
import { Suspense } from 'react';
import DashboardRealtimeWrapper from '@/components/DashboardRealtimeWrapper';

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

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await getServerSession(authOptions);
  const awaitedSearchParams = await searchParams;

  // Extract search params
  const status = typeof awaitedSearchParams.status === 'string' ? awaitedSearchParams.status : undefined;
  const assignee = typeof awaitedSearchParams.assignee === 'string' ? awaitedSearchParams.assignee : undefined;
  const service = typeof awaitedSearchParams.service === 'string' ? awaitedSearchParams.service : undefined;
  const urgency = typeof awaitedSearchParams.urgency === 'string' ? awaitedSearchParams.urgency : undefined;
  const page = typeof awaitedSearchParams.page === 'string' ? parseInt(awaitedSearchParams.page) || 1 : 1;
  const sortBy = typeof awaitedSearchParams.sortBy === 'string' ? awaitedSearchParams.sortBy : 'createdAt';
  const sortOrder = typeof awaitedSearchParams.sortOrder === 'string' ? (awaitedSearchParams.sortOrder as 'asc' | 'desc') : 'desc';
  const range = typeof awaitedSearchParams.range === 'string' ? awaitedSearchParams.range : '30';
  const customStart = typeof awaitedSearchParams.startDate === 'string' ? awaitedSearchParams.startDate : undefined;
  const customEnd = typeof awaitedSearchParams.endDate === 'string' ? awaitedSearchParams.endDate : undefined;

  // Get user name for greeting
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({
    where: { email },
    select: { name: true }
  }) : null;
  const userName = user?.name || 'there';

  // Build date filter
  let dateFilter: any = {};
  if (range && range !== 'all') {
    if (range === 'custom' && customStart && customEnd) {
      dateFilter.createdAt = {
        gte: new Date(customStart),
        lte: new Date(customEnd)
      };
    } else {
      const days = parseInt(range);
      if (!isNaN(days)) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter.createdAt = {
          gte: startDate
        };
      }
    }
  }

  // Build filter query
  const where: any = { ...dateFilter };
  if (status && status !== 'ALL') where.status = status;
  if (assignee !== undefined) {
    if (assignee === '') {
      where.assigneeId = null;
    } else {
      where.assigneeId = assignee;
    }
  }
  if (service) where.serviceId = service;
  if (urgency) where.urgency = urgency;

  // Build orderBy
  const orderBy: any = {};
  if (sortBy === 'createdAt') {
    orderBy.createdAt = sortOrder;
  } else if (sortBy === 'status') {
    orderBy.status = sortOrder;
  } else if (sortBy === 'urgency') {
    orderBy.urgency = sortOrder;
  } else {
    orderBy.createdAt = 'desc';
  }

  const skip = (page - 1) * INCIDENTS_PER_PAGE;

  // Fetch Data in Parallel
  const [
    incidents,
    totalCount,
    services,
    users,
    activeShifts,
    allIncidents,
    allResolvedCount,
    allOpenIncidentsCount,
    allAcknowledgedCount,
    allCriticalIncidentsCount,
    unassignedCount,
    slaMetrics
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
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy,
      skip,
      take: INCIDENTS_PER_PAGE
    }),
    prisma.incident.count({ where }),
    prisma.service.findMany(),
    prisma.user.findMany(),
    prisma.onCallShift.findMany({
      where: {
        start: { lte: new Date() },
        end: { gte: new Date() }
      },
      include: { user: true, schedule: true }
    }),
    // Optimized: Only fetch status and urgency for distribution calculation
    // Limit to recent incidents for performance (last 1000 incidents)
    prisma.incident.findMany({
      select: { status: true, urgency: true, assigneeId: true },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit for performance
    }),
    prisma.incident.count({
      where: {
        status: 'RESOLVED',
        ...dateFilter
      }
    }),
    // All-time counts (for Command Center and Advanced Metrics)
    prisma.incident.count({
      where: {
        status: { not: 'RESOLVED' }
      }
    }),
    prisma.incident.count({
      where: {
        status: 'ACKNOWLEDGED'
      }
    }),
    prisma.incident.count({
      where: {
        status: { not: 'RESOLVED' },
        urgency: 'HIGH'
      }
    }),
    prisma.incident.count({
      where: {
        status: { not: 'RESOLVED' },
        assigneeId: null
      }
    }),
    calculateSLAMetrics()
  ]);

  // Calculate MTTA
  const acknowledgedIncidents = await prisma.incident.findMany({
    where: {
      acknowledgedAt: { not: null },
      status: { not: 'RESOLVED' }
    },
    select: {
      createdAt: true,
      acknowledgedAt: true
    }
  });

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

  // Calculate status distribution
  const statusCounts = allIncidents.reduce((acc, incident) => {
    acc[incident.status] = (acc[incident.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusDistribution = [
    { label: 'Open', value: statusCounts['OPEN'] || 0, color: '#ef4444' },
    { label: 'Acknowledged', value: statusCounts['ACKNOWLEDGED'] || 0, color: '#3b82f6' },
    { label: 'Resolved', value: statusCounts['RESOLVED'] || 0, color: '#22c55e' },
    { label: 'Snoozed', value: statusCounts['SNOOZED'] || 0, color: '#eab308' },
    { label: 'Suppressed', value: statusCounts['SUPPRESSED'] || 0, color: '#a855f7' }
  ].filter(item => item.value > 0);

  // Calculate urgency distribution
  const urgencyCounts = allIncidents.reduce((acc, incident) => {
    acc[incident.urgency] = (acc[incident.urgency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const urgencyDistribution = [
    { label: 'High', value: urgencyCounts['HIGH'] || 0, color: '#ef4444' },
    { label: 'Medium', value: urgencyCounts['MEDIUM'] || 0, color: '#f59e0b' },
    { label: 'Low', value: urgencyCounts['LOW'] || 0, color: '#22c55e' }
  ].filter(item => item.value > 0);

  // Calculate previous period data for comparison
  const getDaysFromRange = (range: string): number => {
    if (range === 'all') return 0;
    if (range === 'custom') return 30; // Default to 30 days for custom
    const days = parseInt(range);
    return isNaN(days) ? 30 : days;
  };

  const currentPeriodDays = getDaysFromRange(range);
  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - (currentPeriodDays * 2));
  const previousPeriodEnd = new Date();
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - currentPeriodDays);

  const previousPeriodIncidents = currentPeriodDays > 0 ? await Promise.all([
    prisma.incident.count({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        }
      }
    }),
    prisma.incident.count({
      where: {
        status: { not: 'RESOLVED' },
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        }
      }
    }),
    prisma.incident.count({
      where: {
        status: 'RESOLVED',
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        }
      }
    }),
    prisma.incident.count({
      where: {
        status: 'ACKNOWLEDGED',
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        }
      }
    }),
    prisma.incident.count({
      where: {
        status: { not: 'RESOLVED' },
        urgency: 'HIGH',
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        }
      }
    })
  ]) : [0, 0, 0, 0, 0];

  const [prevTotal, prevOpen, prevResolved, prevAcknowledged, prevCritical] = previousPeriodIncidents;

  // Get service health data
  const servicesWithIncidents = await Promise.all(
    services.map(async (service) => {
      const [activeCount, criticalCount] = await Promise.all([
        prisma.incident.count({
          where: {
            serviceId: service.id,
            status: { not: 'RESOLVED' }
          }
        }),
        prisma.incident.count({
          where: {
            serviceId: service.id,
            status: { not: 'RESOLVED' },
            urgency: 'HIGH'
          }
        })
      ]);

      return {
        id: service.id,
        name: service.name,
        status: service.status,
        activeIncidents: activeCount,
        criticalIncidents: criticalCount
      };
    })
  );

  // Helper functions for period labels
  const getPeriodLabels = () => {
    if (range === 'all') return { current: 'All Time', previous: 'All Time' };
    const days = getDaysFromRange(range);
    if (days === 0) return { current: 'All Time', previous: 'All Time' };

    return {
      current: `Last ${days} days`,
      previous: `Previous ${days} days`
    };
  };

  const periodLabels = getPeriodLabels();

  // Calculate system status
  const openIncidentsList = incidents.filter(i => i.status !== 'RESOLVED');
  const criticalIncidents = openIncidentsList.filter(i => i.urgency === 'HIGH');

  const systemStatus = criticalIncidents.length > 0
    ? { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
    : openIncidentsList.length > 0
      ? { label: 'DEGRADED', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
      : { label: 'OPERATIONAL', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };

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
  const totalInRange = totalCount;

  // Calculate current period metrics (filtered by date range)
  const currentPeriodOpen = await prisma.incident.count({
    where: {
      status: { not: 'RESOLVED' },
      ...dateFilter
    }
  });

  const currentPeriodAcknowledged = await prisma.incident.count({
    where: {
      status: 'ACKNOWLEDGED',
      ...dateFilter
    }
  });

  const currentPeriodCritical = await prisma.incident.count({
    where: {
      status: { not: 'RESOLVED' },
      urgency: 'HIGH',
      ...dateFilter
    }
  });
  const getRangeLabel = () => {
    if (range === '7') return '(7d)';
    if (range === '30') return '(30d)';
    if (range === '90') return '(90d)';
    if (range === 'all') return '(All Time)';
    return '(30d)';
  };

  return (
    <DashboardRealtimeWrapper>
    <main style={{ paddingBottom: '2rem' }}>
      <div className="command-center-hero" style={{
        background: 'var(--gradient-primary)', // Match sidebar theme
        boxShadow: '4px 0 24px rgba(211, 47, 47, 0.15)' // Match sidebar shadow
      }}>
        <div className="command-center-header">
          <div className="command-center-left">
            <h1 className="command-center-title">Command Center</h1>
            <div className="command-center-status">
              <span className="system-status-label">System Status:</span>
              <strong className="system-status-value" style={{ color: '#ff4444' }}>{systemStatus.label}</strong>
              {allOpenIncidentsCount > 0 && (
                <span className="system-status-count">
                  ({allOpenIncidentsCount} active incident{allOpenIncidentsCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            <div className="command-center-time-range">
              <Suspense fallback={
                <div style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)'
                }}>
                  <div style={{
                    width: '120px',
                    height: '32px',
                    background: 'var(--color-neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    animation: 'skeleton-pulse 1.5s ease-in-out infinite'
                  }} />
                </div>
              }>
                <DashboardTimeRange />
              </Suspense>
            </div>
          </div>
          <div className="command-center-actions">
            <Suspense fallback={
              <div style={{
                width: '100px',
                height: '40px',
                background: 'var(--color-neutral-200)',
                borderRadius: 'var(--radius-md)',
                animation: 'skeleton-pulse 1.5s ease-in-out infinite'
              }} />
            }>
              <DashboardRefresh />
            </Suspense>
            <Suspense fallback={
              <div style={{
                width: '100px',
                height: '40px',
                background: 'var(--color-neutral-200)',
                borderRadius: 'var(--radius-md)',
                animation: 'skeleton-pulse 1.5s ease-in-out infinite'
              }} />
            }>
              <DashboardExport
                incidents={incidents}
                filters={{
                  status: status || undefined,
                  service: service || undefined,
                  assignee: assignee || undefined,
                  range: range !== 'all' ? range : undefined
                }}
                metrics={{
                  totalOpen: allOpenIncidentsCount,
                  totalResolved: allResolvedCount,
                  totalAcknowledged: allAcknowledgedCount,
                  unassigned: unassignedCount
                }}
              />
            </Suspense>
          </div>
        </div>

        {/* Metrics in one line */}
        <div className="command-center-metrics">
          <div className="command-metric-card">
            <div className="command-metric-value">{totalInRange}</div>
            <div className="command-metric-label">TOTAL {getRangeLabel()}</div>
          </div>
          <div className="command-metric-card">
            <div className="command-metric-value">{currentPeriodOpen}</div>
            <div className="command-metric-label">OPEN {getRangeLabel()}</div>
          </div>
          <div className="command-metric-card">
            <div className="command-metric-value">{allResolvedCount}</div>
            <div className="command-metric-label">RESOLVED {getRangeLabel()}</div>
          </div>
          <div className="command-metric-card">
            <div className="command-metric-value">{unassignedCount}</div>
            <div className="command-metric-label">UNASSIGNED (All Time)</div>
          </div>
        </div>
      </div>


      {/* Main Content Grid - Two Column Layout (matching users page) */}
      <div className="dashboard-main-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)', // Mobile: single column
        gap: '1.5rem'
      }}>
        {/* Left Column - Filters and Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Filters Panel - White glass panel */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <path d="M3 6l3 3m0 0l3-3m-3 3v12m6-9h6m-6 3h6m-6 3h6m-6 3h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>Filter Incidents</h2>
            </div>

            {/* Saved Filters */}
            <div style={{ marginBottom: '1rem' }}>
              <Suspense fallback={
                <div style={{
                  height: '32px',
                  background: 'var(--color-neutral-200)',
                  borderRadius: 'var(--radius-md)',
                  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                  width: '200px'
                }} />
              }>
                <DashboardSavedFilters />
              </Suspense>
            </div>

            {/* Quick Filters */}
            <div style={{ marginBottom: '1rem' }}>
              <Suspense fallback={
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-2)',
                  height: '40px'
                }}>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '40px',
                        background: 'var(--color-neutral-200)',
                        borderRadius: 'var(--radius-md)',
                        animation: 'skeleton-pulse 1.5s ease-in-out infinite'
                      }}
                    />
                  ))}
                </div>
              }>
                <DashboardQuickFilters />
              </Suspense>
            </div>

            {/* Filter Chips */}
            <Suspense fallback={
              <div style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
                flexWrap: 'wrap',
                minHeight: '40px'
              }}>
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      width: '80px',
                      height: '28px',
                      background: 'var(--color-neutral-200)',
                      borderRadius: 'var(--radius-full)',
                      animation: 'skeleton-pulse 1.5s ease-in-out infinite'
                    }}
                  />
                ))}
              </div>
            }>
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

          {/* Incidents Table Panel - White glass panel */}
          <div className="glass-panel" style={{ background: 'white', padding: '0', overflow: 'hidden' }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.2rem 0' }}>Incident Directory</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Showing {skip + 1}-{Math.min(skip + INCIDENTS_PER_PAGE, totalCount)} of {totalCount} incidents
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
                  transition: 'all 0.2s ease'
                }}
              >
                View All <span>→</span>
              </Link>
            </div>

            <div
              className="incident-table-scroll"
              style={{
                overflowX: 'auto'
              }}>
              {incidents.length === 0 ? (
                <div style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, margin: '0 auto 1rem' }}>
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No incidents found</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try adjusting your filters to see more results.</p>
                </div>
              ) : (
                <IncidentTable
                  incidents={incidents}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              )}
            </div>

            {/* Pagination - Enhanced style */}
            {totalPages > 1 && (
              <div style={{
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                background: 'linear-gradient(135deg, #fafbfc 0%, #ffffff 100%)'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong>
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
                      fontWeight: '600'
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
                      fontWeight: '600'
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
                      fontWeight: '600'
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
                      fontWeight: '600'
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
        <aside className="dashboard-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick Actions Panel */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.15rem 0' }}>Quick Actions</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  {greeting}, {userName}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                href="/incidents/create"
                className="glass-button primary"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
                </svg>
                Trigger Incident
              </Link>
              <Link
                href="/analytics"
                className="glass-button"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18M7 16l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                View Analytics
              </Link>
            </div>
          </div>

          {/* On-Call Widget - Activity */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Who is On-Call
              </h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <Link href="/schedules" className="dashboard-link-hover" style={{
                fontSize: '0.85rem',
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                View All <span>→</span>
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeShifts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, margin: '0 auto 0.5rem' }}>
                    <path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z" />
                  </svg>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>No active on-call shifts</p>
                </div>
              ) : (
                activeShifts.slice(0, 3).map(shift => (
                  <div
                    key={shift.id}
                    className="dashboard-oncall-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem',
                      background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      border: '1px solid rgba(211, 47, 47, 0.2)'
                    }}>
                      {shift.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {shift.user.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {shift.schedule.name}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Performance Metrics Widget */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Performance Metrics
              </h3>
            </div>
            <DashboardPerformanceMetrics
              mtta={mttaMinutes}
              mttr={slaMetrics.mttr}
              ackSlaRate={slaMetrics.ackCompliance}
              resolveSlaRate={slaMetrics.resolveCompliance}
            />
          </div>

          {/* SLA Metrics Widget - Enhanced SLA Tracking */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading SLA metrics...</div>}>
              <DashboardSLAMetrics
                metrics={slaMetrics}
                period={range === 'all' ? 'All time' : range === 'custom' ? 'Custom period' : `Last ${range} days`}
              />
            </Suspense>
          </div>

          {/* Status Distribution - Charts */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                  <path d="M3 3v18h18M7 16l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Status Distribution
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <DashboardStatusChart data={statusDistribution} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {statusDistribution.map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.4rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
                      <span>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: '600' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Metrics - Metrics */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Advanced Metrics
              </h3>
            </div>
            <DashboardAdvancedMetrics
              totalIncidents={allIncidents.length}
              openIncidents={allOpenIncidentsCount}
              resolvedIncidents={allResolvedCount}
              acknowledgedIncidents={allAcknowledgedCount}
              criticalIncidents={allCriticalIncidentsCount}
              unassignedIncidents={unassignedCount}
              servicesCount={services.length}
            />
          </div>

          {/* Period Comparison Widget - Comparison */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M3 3v18h18M7 16l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Period Comparison
              </h3>
            </div>
            <DashboardPeriodComparison
              current={{
                total: totalInRange,
                open: currentPeriodOpen,
                resolved: allResolvedCount, // Already filtered by dateFilter
                acknowledged: currentPeriodAcknowledged,
                critical: currentPeriodCritical
              }}
              previous={{
                total: prevTotal,
                open: prevOpen,
                resolved: prevResolved,
                acknowledged: prevAcknowledged,
                critical: prevCritical
              }}
              periodLabel={periodLabels.current}
              previousPeriodLabel={periodLabels.previous}
            />
          </div>

          {/* Service Health Widget - Service Health */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Service Health
              </h3>
            </div>
            <DashboardServiceHealth services={servicesWithIncidents} />
          </div>

          {/* Urgency Distribution - Charts */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Urgency Distribution
              </h3>
            </div>
            <DashboardUrgencyDistribution data={urgencyDistribution} />
          </div>

          {/* Notifications Widget */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Browser Notifications
              </h3>
            </div>
            <Suspense fallback={null}>
              <DashboardNotifications
                criticalCount={allCriticalIncidentsCount}
                unassignedCount={unassignedCount}
              />
            </Suspense>
          </div>
        </aside>
      </div>
    </main>
    </DashboardRealtimeWrapper>
  );
}
