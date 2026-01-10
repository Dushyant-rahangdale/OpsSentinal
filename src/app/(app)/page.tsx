import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { calculateSLAMetrics } from '@/lib/sla-server';
import DashboardRealtimeWrapper from '@/components/DashboardRealtimeWrapper';
import DashboardCommandCenter from '@/components/dashboard/DashboardCommandCenter';
import DashboardIncidentFilters from '@/components/dashboard/DashboardIncidentFilters';
import IncidentsListTable from '@/components/incident/IncidentsListTable';
import QuickActionsPanel from '@/components/dashboard/QuickActionsPanel';
import OnCallWidget from '@/components/dashboard/OnCallWidget';
import SidebarWidget, {
  WIDGET_ICON_BG,
} from '@/components/dashboard/SidebarWidget';
import CompactPerformanceMetrics from '@/components/dashboard/compact/CompactPerformanceMetrics';
import CompactTeamLoad from '@/components/dashboard/compact/CompactTeamLoad';
import SmartInsightsBanner from '@/components/dashboard/SmartInsightsBanner';
import {
  buildDateFilter,
  buildIncidentWhere,
  buildIncidentOrderBy,
  getRangeLabel,
  type DashboardFilters as DashboardFilterParams,
} from '@/lib/dashboard-utils';
import { IncidentListItem } from '@/types/incident-list';

// New Imports for SLA Breach Widget
import { getWidgetData } from '@/lib/widget-data-provider';
import { WidgetProvider } from '@/components/dashboard/WidgetProvider';
import SLABreachAlertsWidget from '@/components/dashboard/widgets/SLABreachAlertsWidget';
import { Badge } from '@/components/ui/shadcn/badge';
import { formatDateTime } from '@/lib/timezone';
import {
  Activity,
  AlertTriangle,
  List,
  ShieldAlert,
  Siren,
  UserRound,
  UsersRound,
  CheckCircle2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { IncidentHeatmapWidget } from '@/components/dashboard/widgets/IncidentHeatmapWidget';
import { IncidentStatus, IncidentUrgency } from '@prisma/client';

export const revalidate = 30;

const INCIDENTS_PREVIEW_LIMIT = 20;
const DASHBOARD_RECENT_INCIDENTS_LIMIT = 15;

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(await getAuthOptions());
  const awaitedSearchParams = await searchParams;

  // Extract search params
  const statusParam =
    typeof awaitedSearchParams.status === 'string' ? awaitedSearchParams.status : undefined;
  const status = statusParam && ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED', 'SUPPRESSED'].includes(statusParam)
    ? statusParam
    : undefined;
  const assigneeParam =
    typeof awaitedSearchParams.assignee === 'string' ? awaitedSearchParams.assignee : undefined;
  const assignee = assigneeParam === undefined || assigneeParam === 'all' ? undefined : assigneeParam;
  const serviceParam =
    typeof awaitedSearchParams.service === 'string' ? awaitedSearchParams.service : undefined;
  const service = serviceParam && serviceParam !== 'all' ? serviceParam : undefined;
  const search =
    typeof awaitedSearchParams.search === 'string' ? awaitedSearchParams.search : '';
  const urgencyParam =
    typeof awaitedSearchParams.urgency === 'string' ? awaitedSearchParams.urgency : undefined;
  const urgency = (
    ['HIGH', 'MEDIUM', 'LOW'].includes(urgencyParam || '') ? urgencyParam : undefined
  ) as 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
  const sortBy =
    typeof awaitedSearchParams.sortBy === 'string' ? awaitedSearchParams.sortBy : undefined;
  const sortOrderParam =
    typeof awaitedSearchParams.sortOrder === 'string' ? awaitedSearchParams.sortOrder : undefined;
  const sortOrder = sortOrderParam === 'asc' || sortOrderParam === 'desc' ? sortOrderParam : 'desc';
  const range = typeof awaitedSearchParams.range === 'string' ? awaitedSearchParams.range : '30';
  const customStart =
    typeof awaitedSearchParams.startDate === 'string' ? awaitedSearchParams.startDate : undefined;
  const customEnd =
    typeof awaitedSearchParams.endDate === 'string' ? awaitedSearchParams.endDate : undefined;
  const currentSort =
    sortBy === 'createdAt' && sortOrder === 'asc'
      ? 'oldest'
      : sortBy === 'status'
        ? 'status'
        : sortBy === 'urgency'
          ? 'urgency'
          : sortBy === 'title'
            ? 'title'
            : 'newest';

  // Get user name for greeting
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, timeZone: true },
    })
    : null;
  const userName = user?.name || 'there';
  const userTimeZone = user?.timeZone || 'UTC';

  // Build filters using utility functions
  const filterParams: DashboardFilterParams = {
    status,
    service,
    assignee,
    urgency,
    search,
    range,
    customStart,
    customEnd,
  };

  // Main query where clause (includes status filter)
  const where = buildIncidentWhere(filterParams);

  // Date filter for SLA calculations
  const dateFilter = buildDateFilter(range, customStart, customEnd);
  const metricsStartDate = dateFilter.createdAt?.gte;
  const metricsEndDate = dateFilter.createdAt?.lte;
  const assigneeFilter = assignee !== undefined ? (assignee === '' ? null : assignee) : undefined;
  const incidentSelect = {
    id: true,
    title: true,
    status: true,
    urgency: true,
    priority: true,
    createdAt: true,
    assigneeId: true,
    escalationStatus: true,
    currentEscalationStep: true,
    nextEscalationAt: true,
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
        email: true,
        avatarUrl: true,
      },
    },
  };

  // Fetch Data in Parallel
  const [incidents, recentIncidents, services, users, slaMetrics, widgetData] = await Promise.all([
    prisma.incident.findMany({
      where,
      select: incidentSelect,
      orderBy: buildIncidentOrderBy(sortBy, sortOrder),
      take: INCIDENTS_PREVIEW_LIMIT,
    }),
    prisma.incident.findMany({
      where,
      select: incidentSelect,
      orderBy: { createdAt: 'desc' },
      take: DASHBOARD_RECENT_INCIDENTS_LIMIT,
    }),
    prisma.service.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    }),
    calculateSLAMetrics({
      serviceId: service,
      assigneeId: assigneeFilter,
      urgency: urgency as 'HIGH' | 'MEDIUM' | 'LOW' | undefined,
      status: status as IncidentStatus | undefined,
      startDate: metricsStartDate,
      endDate: metricsEndDate,
      includeAllTime: range === 'all',
      includeIncidents: true,
      includeActiveIncidents: true,
      incidentLimit: 5,
    }),
    user
      ? getWidgetData(user.id, 'user', {
        serviceId: service,
        assigneeId: assigneeFilter,
        urgency: urgency as 'HIGH' | 'MEDIUM' | 'LOW' | undefined,
        status: status as IncidentStatus | undefined,
        startDate: metricsStartDate,
        endDate: metricsEndDate,
        includeAllTime: range === 'all',
      })
      : Promise.resolve(null),
  ]);

  // Transform incidents for the list table
  const incidentListItems: IncidentListItem[] = incidents.map(inc => ({
    ...inc,
    status: inc.status as IncidentStatus,
    urgency: inc.urgency as IncidentUrgency,
  }));
  const recentIncidentListItems: IncidentListItem[] = recentIncidents.map(inc => ({
    ...inc,
    status: inc.status as IncidentStatus,
    urgency: inc.urgency as IncidentUrgency,
  }));

  // Map SLA Server metrics to Dashboard variables
  const activeShifts = slaMetrics.currentShifts;
  const metricsTotalCount = slaMetrics.totalIncidents;
  const metricsOpenCount = slaMetrics.openCount;
  const metricsResolvedCount = slaMetrics.statusMix.find(s => s.status === 'RESOLVED')?.count ?? 0;
  const unassignedCount = slaMetrics.unassignedActive;

  const allOpenIncidentsCount = slaMetrics.openCount;
  const allAcknowledgedCount = slaMetrics.acknowledgedCount;
  const currentCriticalActive = slaMetrics.criticalCount;
  const currentPeriodAcknowledged = allAcknowledgedCount;
  const mttaMinutes = slaMetrics.mttd;

  // Calculate system status
  const systemStatus =
    currentCriticalActive > 0
      ? { label: 'CRITICAL', color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.1)' }
      : (slaMetrics.mediumUrgencyCount > 0 || slaMetrics.lowUrgencyCount > 0)
        ? { label: 'DEGRADED', color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)' }
        : { label: 'OPERATIONAL', color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.1)' };


  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const totalInRange = metricsTotalCount;
  const rangeBadgeLabel =
    range === 'all' ? 'All time' : range === 'custom' ? 'Custom range' : `Last ${range} days`;
  // Heatmap: Force 1 Year (365 Days) Data Source (Rollup-Backed)
  const heatmapRangeEnd = new Date();
  const heatmapRangeStart = new Date();
  heatmapRangeStart.setDate(heatmapRangeEnd.getDate() - 365);
  const heatmapLabel = 'Activity over last year';

  // Use rawHeatmapData which comes from calculateSLAMetrics (which uses rollups for long ranges)
  const heatmapData = slaMetrics.heatmapData ?? [];
  const heatmapStartIso = heatmapRangeStart.toISOString();
  const heatmapEndIso = heatmapRangeEnd.toISOString();

  const activeIncidentSource = (slaMetrics.activeIncidentSummaries || []).map(incident => ({
    id: incident.id,
    title: incident.title,
    status: incident.status as IncidentStatus,
    urgency: incident.urgency as IncidentUrgency,
    createdAt: incident.createdAt,
    assigneeId: incident.assigneeId,
  }));

  const activeIncidentFallback = incidentListItems.map(incident => ({
    id: incident.id,
    title: incident.title,
    status: incident.status,
    urgency: incident.urgency,
    createdAt: incident.createdAt,
    assigneeId: incident.assigneeId,
  }));

  const activeIncidentCandidates =
    activeIncidentSource.length > 0 ? activeIncidentSource : activeIncidentFallback;

  const activeIncidents = activeIncidentCandidates.filter(
    incident =>
      incident.status !== 'RESOLVED' &&
      incident.status !== 'SNOOZED' &&
      incident.status !== 'SUPPRESSED'
  );
  const criticalIncidents = activeIncidents
    .filter(incident => incident.urgency === 'HIGH')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const criticalFocus = criticalIncidents.slice(0, 3);
  const myQueueItems = user
    ? activeIncidents
      .filter(incident => incident.assigneeId === user.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3)
    : [];
  const servicesAtRisk = slaMetrics.serviceMetrics
    .filter(serviceMetric => (serviceMetric.activeCount ?? 0) > 0)
    .sort((a, b) => (b.activeCount ?? 0) - (a.activeCount ?? 0))
    .slice(0, 4)
    .map(serviceMetric => ({
      id: serviceMetric.id,
      name: serviceMetric.name,
      activeCount: serviceMetric.activeCount ?? 0,
      criticalCount: serviceMetric.criticalCount ?? 0,
    }));

  const teamLoad = slaMetrics.assigneeLoad
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const urgencyVariant: Record<IncidentUrgency, 'danger' | 'warning' | 'info'> = {
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'info',
  };
  const statusVariant: Record<
    IncidentStatus,
    'success' | 'warning' | 'neutral'
  > = {
    OPEN: 'success',
    ACKNOWLEDGED: 'warning',
    RESOLVED: 'neutral',
    SNOOZED: 'neutral',
    SUPPRESSED: 'neutral',
  };

  const urgencyStyles: Record<string, string> = {
    HIGH: 'bg-red-100/50 text-red-700 border-red-200/50',
    MEDIUM: 'bg-amber-100/50 text-amber-700 border-amber-200/50',
    LOW: 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50',
  };

  const statusStyles: Record<string, string> = {
    OPEN: 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50',
    ACKNOWLEDGED: 'bg-amber-100/50 text-amber-700 border-amber-200/50',
    RESOLVED: 'bg-slate-100/50 text-slate-500 border-slate-200/50',
    SNOOZED: 'bg-blue-50/50 text-blue-600 border-blue-200/50',
    SUPPRESSED: 'bg-slate-50/50 text-slate-500 border-slate-200/50',
  };

  return (
    <DashboardRealtimeWrapper>
      <div className="mx-auto w-full px-4 md:px-6 lg:px-8 py-6 min-h-screen space-y-6 [zoom:0.75]">
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
            assignee: assignee !== undefined ? assignee : undefined,
            urgency: urgency || undefined,
            search: search || undefined,
            range,
            startDate: customStart,
            endDate: customEnd,
          }}
          currentPeriodAcknowledged={currentPeriodAcknowledged}
          userTimeZone={userTimeZone}
          isClipped={slaMetrics.isClipped}
          retentionDays={slaMetrics.retentionDays}
        />

        {/* Smart Insights Banner - Auto-generated alerts */}
        <SmartInsightsBanner
          totalIncidents={totalInRange}
          openIncidents={metricsOpenCount}
          criticalIncidents={currentCriticalActive}
          unassignedIncidents={unassignedCount}
          topServiceName={servicesAtRisk[0]?.name}
          topServiceCount={servicesAtRisk[0]?.activeCount}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-6">
            <DashboardIncidentFilters
              services={services}
              users={users}
              currentStatus={status ?? 'all'}
              currentUrgency={urgency ?? 'all'}
              currentService={service ?? 'all'}
              currentAssignee={
                assignee === undefined ? 'all' : assignee === '' ? 'unassigned' : assignee
              }
              currentSearch={search}
              currentSort={currentSort}
              currentRange={range}
              currentCustomStart={customStart}
              currentCustomEnd={customEnd}
              userId={user?.id ?? null}
            />



            {/* Ops Pulse Panel - Unified Container */}
            <div className="group relative rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">

              {/* Header */}
              <div className="p-4 pb-3 border-b border-border/60">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Ops Pulse</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Signals that need attention right now</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="xs">
                      {rangeBadgeLabel}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="p-4">
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="group/card relative rounded-xl border border-border/60 bg-white shadow-sm hover:shadow transition-colors">
                    {/* Header */}
                    <div className="p-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <UserRound className="w-4 h-4" />
                          </div>
                          {myQueueItems.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                              {myQueueItems.length}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">My Queue</h4>
                          <p className="text-[9px] text-slate-500 font-medium">Assigned to you</p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4 space-y-2">
                      {myQueueItems.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-xs text-slate-500 font-medium">Queue is clear!</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {myQueueItems.slice(0, 3).map(item => (
                            <Link
                              key={item.id}
                              href={`/incidents/${item.id}`}
                              className="block p-2 rounded-lg bg-slate-50/40 border border-border/60 hover:border-emerald-200/50 hover:bg-white transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <p className="text-xs font-medium text-slate-700 truncate">
                                  {item.title}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      <Link
                        href={user ? `/?status=OPEN&assignee=${user.id}` : '/incidents?status=OPEN'}
                        className="flex items-center justify-center gap-1 mt-2 py-1.5 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/50 rounded-md transition-colors"
                      >
                        View my queue &rarr;
                      </Link>
                    </div>
                  </div>

                  {/* Critical Focus Card */}
                  <div className="group/card relative rounded-xl border border-border/60 bg-white shadow-sm hover:shadow transition-colors">
                    {/* Header */}
                    <div className="p-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600">
                            <Siren className="w-4 h-4" />
                          </div>
                          {currentCriticalActive > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                              {currentCriticalActive}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Critical Focus</h4>
                          <p className="text-[9px] text-slate-500 font-medium">Immediate attention</p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4 space-y-2">
                      {criticalFocus.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-xs text-slate-500 font-medium">All systems stable</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {criticalFocus.slice(0, 3).map(incident => (
                            <Link
                              key={incident.id}
                              href={`/incidents/${incident.id}`}
                              className="block p-2 rounded-lg bg-slate-50/40 border border-border/60 hover:border-red-200/50 hover:bg-white transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                <p className="text-xs font-medium text-slate-700 truncate">
                                  {incident.title}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      <Link
                        href="/incidents?status=OPEN&urgency=HIGH"
                        className="flex items-center justify-center gap-1 mt-2 py-1.5 text-[10px] font-semibold text-red-700 hover:text-red-800 hover:bg-red-100/50 rounded-md transition-colors"
                      >
                        View critical &rarr;
                      </Link>
                    </div>
                  </div>

                  {/* Services at Risk Card */}
                  <div className="group/card relative rounded-xl border border-border/60 bg-white shadow-sm hover:shadow transition-colors">
                    {/* Header */}
                    <div className="p-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          {servicesAtRisk.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                              {servicesAtRisk.length}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Services at Risk</h4>
                          <p className="text-[9px] text-slate-500 font-medium">Active by service</p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4 space-y-2">
                      {servicesAtRisk.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-xs text-slate-500 font-medium">All services healthy</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {servicesAtRisk.slice(0, 4).map(serviceItem => (
                            <Link
                              key={serviceItem.id}
                              href={`/services/${serviceItem.id}`}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50/40 border border-border/60 hover:border-amber-200/50 hover:bg-white transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <p className="text-xs font-medium text-slate-700 truncate">
                                  {serviceItem.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-slate-500">
                                  {serviceItem.activeCount}
                                </span>
                                {serviceItem.criticalCount > 0 && (
                                  <span className="text-[9px] font-bold text-red-500 ml-1">
                                    {serviceItem.criticalCount} !
                                  </span>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      <Link
                        href="/services"
                        className="flex items-center justify-center gap-1 mt-2 py-1.5 text-[10px] font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 rounded-md transition-colors"
                      >
                        View services &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Heatmap (Heartmap - User Requested) */}
            <IncidentHeatmapWidget
              data={heatmapData}
              rangeLabel={heatmapLabel}
              startDate={heatmapStartIso}
              endDate={heatmapEndIso}
            />

            <IncidentsListTable
              incidents={recentIncidentListItems}
              users={users}
              canManageIncidents={false}
              title="Latest incidents"
              showExport={false}
            />
          </div>

          <aside className="xl:col-span-4 space-y-6 xl:sticky xl:top-6">
            <QuickActionsPanel greeting={greeting} userName={userName} />
            {widgetData && (
              <WidgetProvider initialData={widgetData}>
                <SLABreachAlertsWidget />
              </WidgetProvider>
            )}

            <OnCallWidget activeShifts={activeShifts} />
            <SidebarWidget
              title="Performance"
              iconBg={WIDGET_ICON_BG.blue}
              icon={<TrendingUp className="h-4 w-4" />}
            >
              <CompactPerformanceMetrics
                mtta={mttaMinutes}
                mttr={slaMetrics.mttr}
                ackSlaRate={slaMetrics.ackCompliance}
                resolveSlaRate={slaMetrics.resolveCompliance}
              />
            </SidebarWidget>
            <SidebarWidget
              title="Team Load"
              iconBg={WIDGET_ICON_BG.green}
              icon={<Users className="h-4 w-4" />}
            >
              <CompactTeamLoad assigneeLoad={teamLoad} />
            </SidebarWidget>
          </aside>
        </div>
      </div>
    </DashboardRealtimeWrapper >
  );
}
