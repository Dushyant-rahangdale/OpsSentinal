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
import { calculateSLAMetrics } from '@/lib/sla';
import { Suspense } from 'react';

export const revalidate = 30;

const INCIDENTS_PER_PAGE = 20;

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
    prisma.incident.findMany({
      select: { status: true, urgency: true, assigneeId: true }
    }),
    prisma.incident.count({
      where: {
        status: 'RESOLVED',
        ...dateFilter
      }
    }),
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
  const getRangeLabel = () => {
    if (range === '7') return '(7d)';
    if (range === '30') return '(30d)';
    if (range === '90') return '(90d)';
    if (range === 'all') return '(All Time)';
    return '(30d)';
  };

  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Command Center Hero Section */}
      <div className="command-center-hero">
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
              <Suspense fallback={<div style={{ height: '40px' }} />}>
                <DashboardTimeRange />
              </Suspense>
            </div>
          </div>
          <div className="command-center-actions">
            <Suspense fallback={<div style={{ width: '100px', height: '40px' }} />}>
              <DashboardRefresh />
            </Suspense>
            <Suspense fallback={<div style={{ width: '100px', height: '40px' }} />}>
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
            <div className="command-metric-value">{allOpenIncidentsCount}</div>
            <div className="command-metric-label">OPEN (All Time)</div>
          </div>
          <div className="command-metric-card">
            <div className="command-metric-value">{allResolvedCount}</div>
            <div className="command-metric-label">RESOLVED (All Time)</div>
          </div>
          <div className="command-metric-card">
            <div className="command-metric-value">{unassignedCount}</div>
            <div className="command-metric-label">UNASSIGNED</div>
          </div>
        </div>
      </div>


      {/* Main Content Grid - Two Column Layout (matching users page) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 320px', gap: '1.5rem' }}>
        {/* Left Column - Filters and Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Filters Panel - White glass panel */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Filter Incidents</h2>
            
            {/* Quick Filters */}
            <div style={{ marginBottom: '1rem' }}>
              <Suspense fallback={<div style={{ height: '40px' }} />}>
                <DashboardQuickFilters />
              </Suspense>
            </div>

            {/* Filter Chips */}
            <Suspense fallback={null}>
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
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.15rem' }}>Incident Directory</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Showing {skip + 1}-{Math.min(skip + INCIDENTS_PER_PAGE, totalCount)} of {totalCount} incidents
                </p>
              </div>
              <Link href="/incidents" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                View All Incidents →
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {incidents.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.9rem' }}>No incidents found matching your filters.</p>
                </div>
              ) : (
                <IncidentTable 
                  incidents={incidents} 
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              )}
            </div>

            {/* Pagination - Matching users page style */}
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

        {/* Right Sidebar - All Widgets (matching users page style) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick Actions Panel */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Quick Actions</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {greeting}, {userName}
            </p>
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
                  <path d="M3 3v18h18M7 16l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                View Analytics
              </Link>
            </div>
          </div>

          {/* On-Call Widget */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Who is On-Call</h3>
              <Link href="/schedules" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                View All →
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
                  <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.875rem' }}>
                      {shift.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                        {shift.user.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {shift.schedule.name}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Performance Metrics Widget */}
          <DashboardPerformanceMetrics
            mtta={mttaMinutes}
            mttr={slaMetrics.mttr}
            ackSlaRate={slaMetrics.ackCompliance}
            resolveSlaRate={slaMetrics.resolveCompliance}
          />

          {/* Status Distribution */}
          <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Status Distribution</h3>
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

          {/* Advanced Metrics */}
          <DashboardAdvancedMetrics
            totalIncidents={allIncidents.length}
            openIncidents={allOpenIncidentsCount}
            resolvedIncidents={allResolvedCount}
            acknowledgedIncidents={allAcknowledgedCount}
            criticalIncidents={allCriticalIncidentsCount}
            unassignedIncidents={unassignedCount}
            servicesCount={services.length}
          />
        </aside>
      </div>
    </main>
  );
}
