import { calculateSLAMetrics } from '@/lib/sla-server';
import { formatTimeMinutesMs } from '@/lib/time-format';
import { buildAnalyticsExportUrl } from '@/lib/analytics-export';
import { smoothSeries } from '@/lib/analytics-metrics';
import type { Metadata } from 'next';
import { getUserTimeZone } from '@/lib/timezone';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import MetricCard from '@/components/analytics/MetricCard';
import ChartCard from '@/components/analytics/ChartCard';
import AnalyticsFilters from '@/components/analytics/AnalyticsFilters';
import FilterChips from '@/components/analytics/FilterChips';
import BarChart from '@/components/analytics/BarChart';
import PieChart from '@/components/analytics/PieChart';
import ProgressBar from '@/components/analytics/ProgressBar';
import MetricIcon from '@/components/analytics/MetricIcon';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
  Users,
  TrendingUp,
  Moon,
  Bell,
  Repeat,
  Activity,
  Sparkles,
  LayoutDashboard,
  BarChart3,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import GaugeChart from '@/components/analytics/GaugeChart';
import HeatmapCalendar from '@/components/analytics/HeatmapCalendar';
import LineChart from '@/components/analytics/LineChart';
import ServiceHealthTable from '@/components/analytics/ServiceHealthTable';
import InsightCard from '@/components/analytics/InsightCard';
import './analytics-v2.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics V2 | OpsSentinel',
  description: 'Incident Operations Analytics',
};

const allowedStatus = ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED', 'RESOLVED'] as const;
const allowedUrgency = ['HIGH', 'LOW'] as const;
const allowedWindows = new Set([1, 3, 7, 14, 30, 60, 90]);

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: '#dc2626',
    ACKNOWLEDGED: '#2563eb',
    SNOOZED: '#ca8a04',
    SUPPRESSED: '#7c3aed',
    RESOLVED: '#16a34a',
  };
  return colors[status] || '#6b7280';
}

function buildSparklinePath(values: number[], width: number = 72, height: number = 24): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  if (values.length === 1) {
    const y = height - ((values[0] - min) / range) * height;
    return `M0,${y.toFixed(1)} L${width},${y.toFixed(1)}`;
  }

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildSparklineAreaPath(values: number[], width: number = 72, height: number = 24): string {
  const linePath = buildSparklinePath(values, width, height);
  if (!linePath) return '';
  return `${linePath} L${width},${height} L0,${height} Z`;
}

type SearchParams = {
  service?: string;
  team?: string;
  assignee?: string;
  status?: string;
  urgency?: string;
  window?: string;
};

export default async function AnalyticsV2Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(await getAuthOptions());
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({ where: { email }, select: { timeZone: true } })
    : null;
  const userTimeZone = getUserTimeZone(user ?? undefined);

  const params = await searchParams;
  const teamId =
    typeof params?.team === 'string' && params.team !== 'ALL' ? params.team : undefined;
  const serviceId =
    typeof params?.service === 'string' && params.service !== 'ALL' ? params.service : undefined;
  const assigneeId =
    typeof params?.assignee === 'string' && params.assignee !== 'ALL' ? params.assignee : undefined;
  const statusFilter =
    typeof params?.status === 'string' &&
    allowedStatus.includes(params.status as (typeof allowedStatus)[number])
      ? (params.status as (typeof allowedStatus)[number])
      : undefined;
  const urgencyFilter =
    typeof params?.urgency === 'string' &&
    allowedUrgency.includes(params.urgency as (typeof allowedUrgency)[number])
      ? (params.urgency as (typeof allowedUrgency)[number])
      : undefined;
  const windowCandidate = Number(params?.window ?? 7);
  const windowDays = allowedWindows.has(windowCandidate) ? windowCandidate : 7;

  const [metrics, teams, services, users] = await Promise.all([
    calculateSLAMetrics({
      teamId,
      serviceId,
      assigneeId,
      status: statusFilter,
      urgency: urgencyFilter,
      windowDays,
      userTimeZone,
    }),
    prisma.team.findMany({ select: { id: true, name: true } }),
    prisma.service.findMany({ select: { id: true, name: true, teamId: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);

  const servicesForFilter = teamId ? services.filter(s => s.teamId === teamId) : services;

  const formatMinutes = (val: number | null) =>
    val === null ? '--' : formatTimeMinutesMs(val * 60 * 1000);
  const formatPercent = (val: number) => `${val.toFixed(0)}%`;
  const formatHours = (ms: number) => `${(ms / 3600000).toFixed(1)}h`;
  const getComplianceStatus = (val: number) =>
    val >= 95 ? 'success' : val >= 80 ? 'warning' : 'danger';
  const maxTrend = Math.max(1, ...metrics.trendSeries.map(e => e.count));
  const lowUrgencyCount = Math.max(0, metrics.totalIncidents - metrics.highUrgencyCount);
  const ackSlaBurnRate = Math.max(0, 100 - metrics.ackCompliance);
  const resolveSlaBurnRate = Math.max(0, 100 - metrics.resolveCompliance);
  const activeFilterCount =
    [teamId, serviceId, assigneeId, statusFilter, urgencyFilter].filter(value => Boolean(value))
      .length + (windowDays !== 7 ? 1 : 0);

  const getDelta = (current: number | null, previous: number | null) => {
    if (current === null || previous === null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const formatDelta = (delta: number | null) => {
    if (delta === null) return undefined;
    const prefix = delta > 0 ? '+' : '';
    return `${prefix}${delta.toFixed(1)}% vs prev`;
  };

  const getTrend = (delta: number | null) => {
    if (delta === null) return undefined;
    if (delta > 0) return 'up';
    if (delta < 0) return 'down';
    return 'neutral';
  };

  const incidentDelta = getDelta(metrics.totalIncidents, metrics.previousPeriod.totalIncidents);
  const mttaDelta = getDelta(metrics.mttd, metrics.previousPeriod.mtta);
  const mttrDelta = getDelta(metrics.mttr, metrics.previousPeriod.mttr);
  const smoothingWindow = windowDays <= 3 ? 1 : windowDays <= 14 ? 3 : 7;
  const countSeries = smoothSeries(
    metrics.trendSeries.map(entry => entry.count),
    smoothingWindow
  );
  const mttaSeries = smoothSeries(
    metrics.trendSeries.map(entry => entry.mtta),
    smoothingWindow
  );
  const mttrSeries = smoothSeries(
    metrics.trendSeries.map(entry => entry.mttr),
    smoothingWindow
  );
  const activeSeries = smoothSeries(
    metrics.trendSeries.map(entry => entry.count),
    smoothingWindow
  );
  const ackComplianceSeries = smoothSeries(
    metrics.trendSeries.map(entry => entry.ackCompliance),
    smoothingWindow
  );
  const resolveRateSeries = smoothSeries(
    metrics.trendSeries.map(entry => entry.resolveRate),
    smoothingWindow
  );
  const escalationRateSeries = smoothSeries(
    metrics.trendSeries.map(entry => entry.escalationRate),
    smoothingWindow
  );

  const showInsights = metrics.insights.length > 0;
  const exportUrl = buildAnalyticsExportUrl({
    windowDays,
    teamId,
    serviceId,
    assigneeId,
    status: statusFilter,
    urgency: urgencyFilter,
  });

  return (
    <main className="page-shell analytics-shell analytics-v2 pb-20">
      <div className="analytics-header">
        <div className="analytics-header-left">
          <div className="analytics-header-pill-row">
            <span className="analytics-status-pill">
              <span className="analytics-live-dot" aria-hidden="true" />
              Live operations
            </span>
            <span className="analytics-window-pill">Last {windowDays} days</span>
            <span className="analytics-update">Updated just now</span>
          </div>
          <h1 className="analytics-header-title">Analytics &amp; Insights</h1>
          <p className="analytics-header-subtitle">
            Incident health, SLA performance, and on-call readiness.
          </p>
        </div>

        <div className="analytics-header-actions">
          <button className="analytics-ghost-button" type="button">
            <Repeat className="w-4 h-4" />
            Refresh
          </button>
          <button className="analytics-ghost-button" type="button">
            <Bell className="w-4 h-4" />
            Subscribe
          </button>
          <a href={exportUrl} className="analytics-primary-button">
            <BarChart3 className="w-4 h-4" />
            Export report
          </a>
        </div>
      </div>

      <AnalyticsFilters
        teams={teams}
        services={servicesForFilter}
        users={users}
        currentFilters={{
          team: teamId ?? 'ALL',
          service: serviceId ?? 'ALL',
          assignee: assigneeId ?? 'ALL',
          status: statusFilter ?? 'ALL',
          urgency: urgencyFilter ?? 'ALL',
          window: `${windowDays}`,
        }}
      />
      <div className="analytics-context analytics-context-compact">
        <div className="analytics-context-row">
          <div className="analytics-context-inline">
            <span className="analytics-context-label">Filters</span>
            <span className="analytics-context-pill">Last {windowDays} days</span>
          </div>
        </div>
        <FilterChips
          filters={{
            team: teamId ?? 'ALL',
            service: serviceId ?? 'ALL',
            assignee: assigneeId ?? 'ALL',
            status: statusFilter ?? 'ALL',
            urgency: urgencyFilter ?? 'ALL',
          }}
          teams={teams}
          services={servicesForFilter}
          users={users}
        />
      </div>

      <div className="v2-section-header">
        <h2 className="v2-section-title">
          <LayoutDashboard className="w-5 h-5" /> Executive Summary
        </h2>
        <span className="text-xs text-muted-foreground">Highlights vs previous period</span>
      </div>
      <section className="v2-grid-4 mb-4">
        <MetricCard
          label={`Incidents (${windowDays}d)`}
          value={metrics.totalIncidents.toLocaleString()}
          detail="New incidents"
          trend={getTrend(incidentDelta)}
          trendValue={formatDelta(incidentDelta)}
          variant={incidentDelta !== null && incidentDelta > 0 ? 'warning' : 'default'}
          icon={<MetricIcon type="incidents" />}
          href="/incidents"
          className="analytics-card-large"
        >
          <div className="analytics-kpi-meta">
            <svg
              className="analytics-sparkline analytics-sparkline-blue"
              viewBox="0 0 72 24"
              aria-hidden="true"
            >
              <path className="analytics-sparkline-area" d={buildSparklineAreaPath(countSeries)} />
              <path className="analytics-sparkline-line" d={buildSparklinePath(countSeries)} />
            </svg>
          </div>
        </MetricCard>
        <MetricCard
          label="Active Incidents"
          value={metrics.activeIncidents.toLocaleString()}
          detail="Current backlog"
          variant={metrics.activeIncidents > 5 ? 'danger' : 'default'}
          icon={<MetricIcon type="incidents" />}
          href="/incidents?status=OPEN"
          className="analytics-card-large"
        >
          <div className="analytics-kpi-meta">
            <svg
              className="analytics-sparkline analytics-sparkline-blue"
              viewBox="0 0 72 24"
              aria-hidden="true"
            >
              <path className="analytics-sparkline-area" d={buildSparklineAreaPath(activeSeries)} />
              <path className="analytics-sparkline-line" d={buildSparklinePath(activeSeries)} />
            </svg>
          </div>
        </MetricCard>
        <MetricCard
          label={`MTTA (${windowDays}d)`}
          value={formatMinutes(metrics.mttd)}
          detail="Avg response time"
          trend={getTrend(mttaDelta)}
          trendValue={formatDelta(mttaDelta)}
          variant="primary"
          icon={<MetricIcon type="MTTA" />}
          href="/incidents"
          className="analytics-card-large"
        >
          <div className="analytics-kpi-meta">
            <svg
              className="analytics-sparkline analytics-sparkline-amber"
              viewBox="0 0 72 24"
              aria-hidden="true"
            >
              <path className="analytics-sparkline-area" d={buildSparklineAreaPath(mttaSeries)} />
              <path className="analytics-sparkline-line" d={buildSparklinePath(mttaSeries)} />
            </svg>
          </div>
        </MetricCard>
        <MetricCard
          label={`MTTR (${windowDays}d)`}
          value={formatMinutes(metrics.mttr)}
          detail="Avg resolution time"
          trend={getTrend(mttrDelta)}
          trendValue={formatDelta(mttrDelta)}
          variant="primary"
          icon={<MetricIcon type="MTTR" />}
          href="/incidents?status=RESOLVED"
          className="analytics-card-large"
        >
          <div className="analytics-kpi-meta">
            <svg
              className="analytics-sparkline analytics-sparkline-emerald"
              viewBox="0 0 72 24"
              aria-hidden="true"
            >
              <path className="analytics-sparkline-area" d={buildSparklineAreaPath(mttrSeries)} />
              <path className="analytics-sparkline-line" d={buildSparklinePath(mttrSeries)} />
            </svg>
          </div>
        </MetricCard>
        <MetricCard
          label="Resolution Compliance"
          value={formatPercent(metrics.resolveCompliance)}
          detail="SLA compliance"
          variant={getComplianceStatus(metrics.resolveCompliance) as any}
          icon={<Shield className="w-5 h-5" />}
          href="/incidents?status=RESOLVED"
          className="analytics-card-large"
        >
          <div className="analytics-kpi-meta">
            <svg
              className="analytics-sparkline analytics-sparkline-indigo"
              viewBox="0 0 72 24"
              aria-hidden="true"
            >
              <path className="analytics-sparkline-area" d={buildSparklineAreaPath(mttrSeries)} />
              <path className="analytics-sparkline-line" d={buildSparklinePath(mttrSeries)} />
            </svg>
          </div>
        </MetricCard>
        <MetricCard
          label="Ack SLA"
          value={formatPercent(metrics.ackCompliance)}
          detail="Within target"
          variant={getComplianceStatus(metrics.ackCompliance) as any}
          icon={<Shield className="w-5 h-5" />}
          href="/incidents"
          className="analytics-card-large"
        >
          <div className="analytics-kpi-meta">
            <svg
              className="analytics-sparkline analytics-sparkline-indigo"
              viewBox="0 0 72 24"
              aria-hidden="true"
            >
              <path
                className="analytics-sparkline-area"
                d={buildSparklineAreaPath(ackComplianceSeries)}
              />
              <path
                className="analytics-sparkline-line"
                d={buildSparklinePath(ackComplianceSeries)}
              />
            </svg>
          </div>
        </MetricCard>
        <MetricCard
          label="Resolve Rate"
          value={formatPercent(metrics.resolveRate)}
          detail="Completion"
          variant={metrics.resolveRate > 80 ? 'success' : 'default'}
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          href="/incidents?status=RESOLVED"
          className="analytics-card-large"
        >
          <div className="analytics-kpi-meta">
            <svg
              className="analytics-sparkline analytics-sparkline-emerald"
              viewBox="0 0 72 24"
              aria-hidden="true"
            >
              <path
                className="analytics-sparkline-area"
                d={buildSparklineAreaPath(resolveRateSeries)}
              />
              <path
                className="analytics-sparkline-line"
                d={buildSparklinePath(resolveRateSeries)}
              />
            </svg>
          </div>
        </MetricCard>
        <MetricCard
          label="Escalation Rate"
          value={formatPercent(metrics.escalationRate)}
          detail="Incidents escalated"
          variant={metrics.escalationRate > 20 ? 'warning' : 'default'}
          icon={<TrendingUp className="w-5 h-5" />}
          href="/incidents"
          className="analytics-card-large"
        >
          <div className="analytics-kpi-meta">
            <svg
              className="analytics-sparkline analytics-sparkline-rose"
              viewBox="0 0 72 24"
              aria-hidden="true"
            >
              <path
                className="analytics-sparkline-area"
                d={buildSparklineAreaPath(escalationRateSeries)}
              />
              <path
                className="analytics-sparkline-line"
                d={buildSparklinePath(escalationRateSeries)}
              />
            </svg>
          </div>
        </MetricCard>
      </section>

      {/* EXTENDED METRIC GRID (Drill Downs Connected) */}
      <section className="v2-grid-4 mb-8">
        {/* Row 1: Rates */}
        <MetricCard
          className="analytics-card-compact"
          label="Ack Rate"
          value={formatPercent(metrics.ackRate)}
          detail="Acknowledgment"
          variant={metrics.ackRate > 90 ? 'success' : 'warning'}
          icon={<CheckCircle className="w-5 h-5 text-blue-500" />}
          href="/incidents?status=ACKNOWLEDGED"
        />
        <MetricCard
          className="analytics-card-compact"
          label="Resolve Breaches"
          value={metrics.resolveBreaches.toLocaleString()}
          detail="SLA misses"
          variant={metrics.resolveBreaches > 0 ? 'warning' : 'success'}
          icon={<AlertCircle className="w-5 h-5 text-rose-500" />}
          href="/incidents?status=RESOLVED"
        />
        <MetricCard
          className="analytics-card-compact"
          label="High Urgency"
          value={formatPercent(metrics.highUrgencyRate)}
          detail="Share of Total"
          variant={metrics.highUrgencyRate > 50 ? 'warning' : 'default'}
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          href="/incidents?urgency=HIGH"
        />
        <MetricCard
          className="analytics-card-compact"
          label="Ack Breaches"
          value={metrics.ackBreaches.toLocaleString()}
          detail="SLA misses"
          variant={metrics.ackBreaches > 0 ? 'warning' : 'success'}
          icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
          href="/incidents"
        />

        {/* Row 2: Operational */}
        <MetricCard
          className="analytics-card-compact"
          label="Alerts"
          value={metrics.alertsCount.toLocaleString()}
          detail="Total Signals"
          variant="default"
          icon={<Bell className="w-5 h-5 text-gray-500" />}
          href="/alerts"
        />
        <MetricCard
          className="analytics-card-compact"
          label="Noise Ratio"
          value={metrics.alertsPerIncident.toFixed(1) + 'x'}
          detail="Alerts/Incident"
          variant="default"
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
          href="/alerts"
        />
        <MetricCard
          className="analytics-card-compact"
          label="Unassigned"
          value={metrics.unassignedActive.toLocaleString()}
          detail="Needs Owner"
          variant={metrics.unassignedActive > 0 ? 'warning' : 'success'}
          icon={<Users className="w-5 h-5" />}
          href="/incidents?assignee=UNASSIGNED"
        />
        <MetricCard
          className="analytics-card-compact"
          label="Coverage Gaps"
          value={metrics.coverageGapDays.toLocaleString()}
          detail="Days uncovered"
          variant={metrics.coverageGapDays > 0 ? 'warning' : 'success'}
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          href="/on-call"
        />

        {/* Row 3: Coverage */}
        <MetricCard
          className="analytics-card-compact"
          label="After Hours"
          value={formatPercent(metrics.afterHoursRate)}
          detail="Off-Business Hours"
          variant="default"
          icon={<Moon className="w-5 h-5 text-indigo-500" />}
          href="/on-call"
        />
        <MetricCard
          className="analytics-card-compact"
          label="Coverage"
          value={formatPercent(metrics.coveragePercent)}
          detail="On-Call Schedule"
          variant={metrics.coveragePercent > 95 ? 'success' : 'danger'}
          icon={<Shield className="w-5 h-5" />}
          href="/on-call"
        />
        <MetricCard
          className="analytics-card-compact"
          label="On-Call Hours"
          value={formatHours(metrics.onCallHoursMs)}
          detail="Total Scheduled"
          variant="primary"
          icon={<Clock className="w-5 h-5" />}
          href="/on-call"
        />
        <MetricCard
          className="analytics-card-compact"
          label="MTBF"
          value={metrics.mtbfMs ? formatHours(metrics.mtbfMs) : '--'}
          detail="Mean Time Between"
          variant="default"
          icon={<Activity className="w-5 h-5" />}
          href="/incidents"
        />
      </section>

      {/* SPLIT ROW: Intelligent Insights & Response Trends */}
      <div className={`${showInsights ? 'v2-grid-split' : 'w-full'} mb-8`}>
        {/* INSIGHTS */}
        {showInsights && (
          <div className="glass-panel p-4 h-full analytics-insights">
            <div className="analytics-insights-header">
              <div className="analytics-insights-title">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Smart Insights</span>
              </div>
              <span className="analytics-insights-badge">Last {windowDays} days</span>
            </div>
            <div className="analytics-insights-list">
              {metrics.insights.slice(0, 5).map((insight, i) => (
                <div
                  className={`analytics-insights-item ${insight.type === 'positive' ? 'is-positive' : insight.type === 'negative' ? 'is-negative' : ''}`}
                  key={i}
                >
                  <div className="analytics-insights-item-title">
                    <span className="analytics-insights-item-dot" />
                    <span>
                      {insight.type === 'positive'
                        ? 'Opportunity'
                        : insight.type === 'negative'
                          ? 'Attention'
                          : 'Insight'}
                    </span>
                  </div>
                  <div className="analytics-insights-item-text">{insight.text}</div>
                </div>
              ))}
            </div>
            <div className="analytics-insights-footer">
              <span>{metrics.totalIncidents.toLocaleString()} incidents analyzed</span>
              <span>Updated just now</span>
            </div>
          </div>
        )}

        {/* CHART */}
        <div>
          <ChartCard
            title={`Response Performance Trends (Last ${windowDays} Days)`}
            subtitle="MTTA vs MTTR"
            className="chart-accent-amber analytics-trend-card"
          >
            <div className="h-280">
              {metrics.totalIncidents === 0 ? (
                <div className="analytics-empty-state">
                  <div className="analytics-empty-title">No incidents in this window</div>
                  <div className="analytics-empty-description">
                    Response trends will appear once incidents are logged.
                  </div>
                </div>
              ) : (
                <>
                  <div className="analytics-trend-header">
                    <div className="analytics-trend-legend">
                      <span className="analytics-trend-chip">
                        <span className="analytics-trend-dot amber" />
                        MTTA (Response)
                      </span>
                      <span className="analytics-trend-chip">
                        <span className="analytics-trend-dot emerald" />
                        MTTR (Resolution)
                      </span>
                    </div>
                    <div className="analytics-trend-meta">
                      <span className="analytics-trend-meta-label">Window</span>
                      <span className="analytics-trend-meta-value">{windowDays} days</span>
                    </div>
                  </div>
                  <div className="analytics-trend-grid">
                    <div className="analytics-trend-chart">
                      <LineChart
                        data={metrics.trendSeries}
                        lines={[
                          { key: 'mtta', color: '#f59e0b', label: 'MTTA (Response)' },
                          { key: 'mttr', color: '#10b981', label: 'MTTR (Resolution)' },
                        ]}
                        height={280}
                        valueFormatter={(v: number) => formatTimeMinutesMs(v * 60000)}
                      />
                    </div>
                    <div className="analytics-trend-rail">
                      <div className="analytics-trend-rail-block">
                        <div className="analytics-trend-rail-title">Current averages</div>
                        <div className="analytics-trend-stat">
                          <span>MTTA avg</span>
                          <strong>{formatMinutes(metrics.mttd)}</strong>
                        </div>
                        <div className="analytics-trend-stat">
                          <span>MTTR avg</span>
                          <strong>{formatMinutes(metrics.mttr)}</strong>
                        </div>
                        <div className="analytics-trend-stat">
                          <span>Resolve SLA</span>
                          <strong>{formatPercent(metrics.resolveCompliance)}</strong>
                        </div>
                      </div>
                      <div className="analytics-trend-rail-block">
                        <div className="analytics-trend-rail-title">Response benchmarks</div>
                        <div className="analytics-trend-stat">
                          <span>MTTA p50</span>
                          <strong>
                            {metrics.mttaP50 === null ? '--' : formatMinutes(metrics.mttaP50)}
                          </strong>
                        </div>
                        <div className="analytics-trend-stat">
                          <span>MTTA p95</span>
                          <strong>
                            {metrics.mttaP95 === null ? '--' : formatMinutes(metrics.mttaP95)}
                          </strong>
                        </div>
                        <div className="analytics-trend-stat">
                          <span>MTTR p50</span>
                          <strong>
                            {metrics.mttrP50 === null ? '--' : formatMinutes(metrics.mttrP50)}
                          </strong>
                        </div>
                        <div className="analytics-trend-stat">
                          <span>MTTR p95</span>
                          <strong>
                            {metrics.mttrP95 === null ? '--' : formatMinutes(metrics.mttrP95)}
                          </strong>
                        </div>
                      </div>
                      <div className="analytics-trend-rail-block">
                        <div className="analytics-trend-rail-title">Change vs prev</div>
                        <div className="analytics-trend-stat">
                          <span>MTTA delta</span>
                          <strong>
                            {mttaDelta === null ? '--' : `${Math.abs(mttaDelta).toFixed(1)}%`}
                          </strong>
                        </div>
                        <div className="analytics-trend-stat">
                          <span>MTTR delta</span>
                          <strong>
                            {mttrDelta === null ? '--' : `${Math.abs(mttrDelta).toFixed(1)}%`}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ChartCard>
        </div>
      </div>

      <section className="glass-panel mb-8 analytics-narrative analytics-narrative-compact">
        <div className="analytics-narrative-header">
          <div className="analytics-narrative-title-block">
            <span className="analytics-narrative-kicker">Narrative</span>
            <h3 className="analytics-narrative-title">Key changes vs previous period</h3>
          </div>
          <a href="/incidents" className="analytics-narrative-link">
            View incidents
          </a>
        </div>
        <div className="analytics-narrative-list">
          <div
            className={`analytics-narrative-item ${incidentDelta !== null && incidentDelta > 0 ? 'is-up' : incidentDelta !== null && incidentDelta < 0 ? 'is-down' : ''}`}
          >
            <span>Incident volume</span>
            <strong>
              {incidentDelta === null
                ? 'No prior data'
                : `${Math.abs(incidentDelta).toFixed(1)}% ${incidentDelta > 0 ? 'up' : 'down'}`}
            </strong>
          </div>
          <div
            className={`analytics-narrative-item ${mttaDelta !== null && mttaDelta > 0 ? 'is-up' : mttaDelta !== null && mttaDelta < 0 ? 'is-down' : ''}`}
          >
            <span>Response time (MTTA)</span>
            <strong>
              {mttaDelta === null
                ? 'No prior data'
                : `${Math.abs(mttaDelta).toFixed(1)}% ${mttaDelta > 0 ? 'slower' : 'faster'}`}
            </strong>
          </div>
          <div
            className={`analytics-narrative-item ${mttrDelta !== null && mttrDelta > 0 ? 'is-up' : mttrDelta !== null && mttrDelta < 0 ? 'is-down' : ''}`}
          >
            <span>Resolution time (MTTR)</span>
            <strong>
              {mttrDelta === null
                ? 'No prior data'
                : `${Math.abs(mttrDelta).toFixed(1)}% ${mttrDelta > 0 ? 'slower' : 'faster'}`}
            </strong>
          </div>
        </div>
      </section>

      {/* OPERATIONAL MIX - 3 Cols */}
      <div className="v2-grid-3 mb-8">
        <ChartCard title="Incident Volume Trend" className="chart-accent-blue">
          <div className="h-200">
            {metrics.totalIncidents === 0 ? (
              <div className="analytics-empty-state">
                <div className="analytics-empty-title">No incident volume yet</div>
                <div className="analytics-empty-description">
                  Chart appears when incidents are created.
                </div>
              </div>
            ) : (
              <BarChart data={metrics.trendSeries} maxValue={maxTrend} height={200} showValues />
            )}
          </div>
        </ChartCard>
        <ChartCard title="Current Status Mix" className="chart-accent-slate">
          {metrics.totalIncidents === 0 ? (
            <div className="analytics-empty-state">
              <div className="analytics-empty-title">No status distribution</div>
              <div className="analytics-empty-description">
                Create incidents to populate the mix.
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-6 h-200">
              <PieChart
                data={metrics.statusMix.map(e => ({
                  label: e.status,
                  value: e.count,
                  color: getStatusColor(e.status),
                }))}
                size={140}
              />
              <div className="flex flex-col gap-2 text-xs">
                {metrics.statusMix.map(e => (
                  <div key={e.status} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: getStatusColor(e.status) }}
                    />
                    <span>{e.status}</span>
                    <span className="font-bold ml-auto">{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
        <ChartCard title="Assignee Load" className="chart-accent-indigo">
          <div className="flex flex-col gap-3 h-200 overflow-y-auto pr-2 custom-scrollbar">
            {metrics.assigneeLoad.length === 0 ? (
              <div className="analytics-empty-state">
                <div className="analytics-empty-title">No assignee load yet</div>
                <div className="analytics-empty-description">
                  Assign incidents to see load distribution.
                </div>
              </div>
            ) : (
              metrics.assigneeLoad.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 p-1 rounded hover:bg-muted/50">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm truncate">{a.name}</span>
                  <span className="font-bold text-sm bg-muted px-2 rounded">{a.count}</span>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      <div className="v2-section-header">
        <h2 className="v2-section-title">
          <BarChart3 className="w-5 h-5" /> Distribution & Mix
        </h2>
        <span className="text-xs text-muted-foreground">Service, urgency, and status age</span>
      </div>
      <div className="v2-grid-3 mb-8">
        <ChartCard title="Top Services by Incidents" className="chart-accent-blue">
          <div className="flex flex-col gap-2 h-200 overflow-y-auto pr-2 custom-scrollbar">
            {metrics.topServices.length === 0 ? (
              <div className="text-sm text-muted-foreground">No incidents in this window.</div>
            ) : (
              metrics.topServices.map((service, index) => (
                <div
                  key={service.id}
                  className="flex items-center gap-3 p-1 rounded hover:bg-muted/50"
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index < 3 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm truncate">{service.name}</span>
                  <span className="font-bold text-sm bg-muted px-2 rounded">{service.count}</span>
                </div>
              ))
            )}
          </div>
        </ChartCard>
        <ChartCard title="Urgency Mix" className="chart-accent-rose">
          <div className="flex items-center gap-6 h-200">
            <PieChart
              data={[
                { label: 'HIGH', value: metrics.highUrgencyCount, color: '#dc2626' },
                { label: 'LOW', value: lowUrgencyCount, color: '#6b7280' },
              ]}
              size={140}
            />
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#dc2626' }} />
                <span>HIGH</span>
                <span className="font-bold ml-auto">{metrics.highUrgencyCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#6b7280' }} />
                <span>LOW</span>
                <span className="font-bold ml-auto">{lowUrgencyCount}</span>
              </div>
            </div>
          </div>
        </ChartCard>
        <ChartCard title="State Age Breakdown" className="chart-accent-slate">
          <div className="flex flex-col gap-2 h-200 overflow-y-auto pr-2 custom-scrollbar">
            {metrics.statusAges.map(entry => (
              <div key={entry.status} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{entry.status}</span>
                <span className="font-semibold">
                  {entry.avgMs === null ? '--' : formatHours(entry.avgMs)}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="v2-section-header">
        <h2 className="v2-section-title">
          <Users className="w-5 h-5" /> Ownership & Reliability
        </h2>
        <span className="text-xs text-muted-foreground">On-call load and recurring incidents</span>
      </div>
      <div className="v2-grid-3 mb-8">
        <ChartCard title="On-Call Load" className="chart-accent-indigo">
          <div className="flex flex-col gap-3 h-200 overflow-y-auto pr-2 custom-scrollbar">
            {metrics.onCallLoad.length === 0 ? (
              <div className="text-sm text-muted-foreground">No on-call shifts in this window.</div>
            ) : (
              metrics.onCallLoad.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-1 rounded hover:bg-muted/50"
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index < 3 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm truncate">{entry.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatHours(entry.hoursMs)}
                  </span>
                  <span className="font-bold text-sm bg-muted px-2 rounded">
                    {entry.incidentCount}
                  </span>
                </div>
              ))
            )}
          </div>
        </ChartCard>
        <ChartCard title="Recurring Incident Titles" className="chart-accent-amber">
          <div className="flex flex-col gap-2 h-200 overflow-y-auto pr-2 custom-scrollbar">
            {metrics.recurringTitles.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No recurring incidents in this window.
              </div>
            ) : (
              metrics.recurringTitles.map(entry => (
                <div key={entry.title} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{entry.title}</span>
                  <span className="font-semibold">{entry.count}</span>
                </div>
              ))
            )}
          </div>
        </ChartCard>
        <ChartCard title="Resolution Breakdown" className="chart-accent-emerald">
          <div className="flex flex-col gap-3 h-200">
            <div className="flex items-center justify-between text-sm">
              <span>Auto-resolved</span>
              <span className="font-semibold">
                {metrics.autoResolvedCount.toLocaleString()} (
                {formatPercent(metrics.autoResolveRate)})
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Manual resolved</span>
              <span className="font-semibold">{metrics.manualResolvedCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Reopen rate</span>
              <span className="font-semibold">{formatPercent(metrics.reopenRate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Event volume</span>
              <span className="font-semibold">{metrics.eventsCount.toLocaleString()}</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* SERVICE HEALTH MATRIX */}
      <section className="glass-panel mb-8 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" /> Service Health Matrix
          </h3>
          <span className="text-xs text-muted-foreground">
            {metrics.serviceMetrics.length} Services Monitored
          </span>
        </div>
        <ServiceHealthTable services={metrics.serviceMetrics} />
      </section>

      <div className="v2-section-header">
        <h2 className="v2-section-title">
          <Shield className="w-5 h-5" /> SLA & Coverage
        </h2>
        <span className="text-xs text-muted-foreground">Targets, breaches, and scheduling</span>
      </div>
      <section className="glass-panel mb-8 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Coverage Outlook</h3>
          <span className="text-xs text-muted-foreground">Next 14 days</span>
        </div>
        <div className="p-4">
          <div className="analytics-table">
            <div className="analytics-table-row">
              <span>Coverage</span>
              <strong>{formatPercent(metrics.coveragePercent)}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Coverage gap days</span>
              <strong>{metrics.coverageGapDays.toLocaleString()}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Scheduled on-call hours</span>
              <strong>{formatHours(metrics.onCallHoursMs)}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Unique responders scheduled</span>
              <strong>{metrics.onCallUsersCount.toLocaleString()}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Active overrides</span>
              <strong>{metrics.activeOverrides.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel mb-8 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">SLA Summary</h3>
          <span className="text-xs text-muted-foreground">{windowDays} day window</span>
        </div>
        <div className="p-4">
          <div className="analytics-table">
            <div className="analytics-table-row">
              <span>MTTA p50</span>
              <strong>{metrics.mttaP50 === null ? '--' : formatMinutes(metrics.mttaP50)}</strong>
            </div>
            <div className="analytics-table-row">
              <span>MTTA p95</span>
              <strong>{metrics.mttaP95 === null ? '--' : formatMinutes(metrics.mttaP95)}</strong>
            </div>
            <div className="analytics-table-row">
              <span>MTTR p50</span>
              <strong>{metrics.mttrP50 === null ? '--' : formatMinutes(metrics.mttrP50)}</strong>
            </div>
            <div className="analytics-table-row">
              <span>MTTR p95</span>
              <strong>{metrics.mttrP95 === null ? '--' : formatMinutes(metrics.mttrP95)}</strong>
            </div>
          </div>
          <div className="analytics-table mt-4">
            <div className="analytics-table-row">
              <span>High urgency share</span>
              <strong>{formatPercent(metrics.highUrgencyRate)}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Ack SLA breaches</span>
              <strong>{metrics.ackBreaches.toLocaleString()}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Resolve SLA breaches</span>
              <strong>{metrics.resolveBreaches.toLocaleString()}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Ack SLA burn</span>
              <strong>{formatPercent(ackSlaBurnRate)}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Resolve SLA burn</span>
              <strong>{formatPercent(resolveSlaBurnRate)}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Unassigned active incidents</span>
              <strong>{metrics.unassignedActive.toLocaleString()}</strong>
            </div>
            <div className="analytics-table-row">
              <span>Incident events logged</span>
              <strong>{metrics.eventsCount.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel mb-8 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">SLA Compliance by Service</h3>
          <span className="text-xs text-muted-foreground">Top services by volume</span>
        </div>
        <div className="p-4">
          <div className="analytics-table">
            {metrics.serviceSlaTable.length === 0 ? (
              <div className="text-sm text-muted-foreground">No SLA data in this window.</div>
            ) : (
              metrics.serviceSlaTable.map(entry => (
                <div key={entry.id} className="analytics-table-row">
                  <span>{entry.name}</span>
                  <strong>
                    Ack {formatPercent(entry.ackRate)} | Resolve {formatPercent(entry.resolveRate)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* GAUGES */}
      <section className="mb-8">
        <div className="v2-section-header">
          <h2 className="v2-section-title">
            <Shield className="w-5 h-5" /> SLA Compliance
          </h2>
        </div>
        <div className="v2-gauge-grid">
          <div className="v2-gauge-card gauge-accent-indigo">
            <GaugeChart value={metrics.ackCompliance} label="Ack SLA" size={120} />
          </div>
          <div className="v2-gauge-card gauge-accent-emerald">
            <GaugeChart value={metrics.resolveCompliance} label="Resolve SLA" size={120} />
          </div>
          <div className="v2-gauge-card gauge-accent-blue">
            <GaugeChart value={metrics.coveragePercent} label="Coverage" size={120} />
          </div>
          <div className="v2-gauge-card gauge-accent-amber">
            <GaugeChart value={metrics.ackRate} label="Ack Rate" size={120} />
          </div>
        </div>
      </section>

      {/* HEATMAP */}
      <section className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-muted-foreground" /> Historical Activity (12
          Weeks)
        </h3>
        <HeatmapCalendar data={metrics.heatmapData} weeks={12} cellSize={16} gap={4} />
      </section>
    </main>
  );
}
