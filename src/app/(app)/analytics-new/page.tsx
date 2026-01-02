import { calculateSLAMetrics } from '@/lib/sla-server';
import { formatTimeMinutesMs } from '@/lib/time-format';
import { assertAdmin } from '@/lib/rbac';
import { Metadata } from 'next';
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
    Shield, CheckCircle, AlertCircle, Zap,
    Users, TrendingUp, Moon, Bell, Repeat, Activity, Sparkles,
    LayoutDashboard, BarChart3, AlertTriangle, Clock
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
    description: 'Incident Operations Analytics'
};

const allowedStatus = ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED', 'RESOLVED'] as const;
const allowedUrgency = ['HIGH', 'LOW'] as const;
const allowedWindows = new Set([1, 3, 7, 14, 30, 60, 90]);

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        'OPEN': '#dc2626',
        'ACKNOWLEDGED': '#2563eb',
        'SNOOZED': '#ca8a04',
        'SUPPRESSED': '#7c3aed',
        'RESOLVED': '#16a34a'
    };
    return colors[status] || '#6b7280';
}

type SearchParams = {
    service?: string;
    team?: string;
    assignee?: string;
    status?: string;
    urgency?: string;
    window?: string;
};

export default async function AnalyticsV2Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
    await assertAdmin();

    const session = await getServerSession(await getAuthOptions());
    const email = session?.user?.email ?? null;
    const user = email ? await prisma.user.findUnique({ where: { email }, select: { timeZone: true } }) : null;
    const userTimeZone = getUserTimeZone(user ?? undefined);

    const params = await searchParams;
    const teamId = typeof params?.team === 'string' && params.team !== 'ALL' ? params.team : undefined;
    const serviceId = typeof params?.service === 'string' && params.service !== 'ALL' ? params.service : undefined;
    const assigneeId = typeof params?.assignee === 'string' && params.assignee !== 'ALL' ? params.assignee : undefined;
    const statusFilter = allowedStatus.includes(params?.status as any) ? (params?.status as typeof allowedStatus[number]) : undefined;
    const urgencyFilter = allowedUrgency.includes(params?.urgency as any) ? (params?.urgency as typeof allowedUrgency[number]) : undefined;
    const windowCandidate = Number(params?.window ?? 7);
    const windowDays = allowedWindows.has(windowCandidate) ? windowCandidate : 7;

    const metrics = await calculateSLAMetrics({
        teamId, serviceId, assigneeId, status: statusFilter, urgency: urgencyFilter, windowDays, userTimeZone
    });

    const [teams, services, users] = await Promise.all([
        prisma.team.findMany({ select: { id: true, name: true } }),
        prisma.service.findMany({ select: { id: true, name: true, teamId: true } }),
        prisma.user.findMany({ select: { id: true, name: true, email: true } })
    ]);

    const servicesForFilter = teamId ? services.filter(s => s.teamId === teamId) : services;

    const formatMinutes = (val: number | null) => val === null ? '--' : formatTimeMinutesMs(val * 60 * 1000);
    const formatPercent = (val: number) => `${val.toFixed(0)}%`;
    const formatHours = (ms: number) => `${(ms / 3600000).toFixed(1)}h`;
    const getComplianceStatus = (val: number) => val >= 95 ? 'success' : val >= 80 ? 'warning' : 'danger';
    const maxTrend = Math.max(1, ...metrics.trendSeries.map(e => e.count));

    const showInsights = metrics.insights.length > 0;

    return (
        <main className="page-shell analytics-shell pb-20">
            {/* Header */}
            {/* Header - Enhanced */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border/40 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Operations</p>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        Analytics & Insights
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Viewing data for the last <span className="font-medium text-foreground">{windowDays} days</span>
                        <span className="text-border mx-1">|</span>
                        <span className="text-xs opacity-70">Updated just now</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background border border-border hover:bg-secondary/50 rounded-lg transition-all shadow-sm">
                        <Repeat className="w-4 h-4" />
                        <span>Refresh</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background border border-border hover:bg-secondary/50 rounded-lg transition-all shadow-sm">
                        <Bell className="w-4 h-4" />
                        <span>Subscribe</span>
                    </button>
                    <a href={`/api/analytics/export?window=${windowDays}`} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-md hover:shadow-lg transition-all">
                        <BarChart3 className="w-4 h-4" />
                        <span>Export Report</span>
                    </a>
                </div>
            </div>

            <AnalyticsFilters
                teams={teams} services={servicesForFilter} users={users}
                currentFilters={{
                    team: teamId ?? 'ALL', service: serviceId ?? 'ALL', assignee: assigneeId ?? 'ALL',
                    status: statusFilter ?? 'ALL', urgency: urgencyFilter ?? 'ALL', window: `${windowDays}`
                }}
            />
            <FilterChips
                filters={{
                    team: teamId ?? 'ALL', service: serviceId ?? 'ALL', assignee: assigneeId ?? 'ALL',
                    status: statusFilter ?? 'ALL', urgency: urgencyFilter ?? 'ALL', window: `${windowDays}`
                }}
                teams={teams} services={servicesForFilter} users={users}
            />

            {/* HERO STATS - Fixed Grid with Drill Downs */}
            <section className="v2-grid-4 mb-4">
                <MetricCard
                    label="Active Incidents"
                    value={metrics.activeIncidents.toLocaleString()}
                    detail="Current Backlog"
                    variant={metrics.activeIncidents > 5 ? 'danger' : 'default'}
                    icon={<MetricIcon type="incidents" />}
                    href="/incidents?status=OPEN"
                />
                <MetricCard
                    label={`MTTA (${windowDays}d)`}
                    value={formatMinutes(metrics.mttd)}
                    detail="Avg Response Time"
                    variant="primary"
                    icon={<MetricIcon type="MTTA" />}
                    href="/incidents"
                />
                <MetricCard
                    label={`MTTR (${windowDays}d)`}
                    value={formatMinutes(metrics.mttr)}
                    detail="Avg Resolution Time"
                    variant="primary"
                    icon={<MetricIcon type="MTTR" />}
                    href="/incidents?status=RESOLVED"
                />
                <MetricCard
                    label="Overall Health"
                    value={formatPercent(metrics.resolveCompliance)}
                    detail="Resolution Compliance"
                    variant={getComplianceStatus(metrics.resolveCompliance) as any}
                    icon={<Shield className="w-5 h-5" />}
                    href="/incidents?status=RESOLVED"
                >
                    <div className="mt-3"><ProgressBar value={metrics.resolveCompliance} variant={getComplianceStatus(metrics.resolveCompliance) as any} size="sm" /></div>
                </MetricCard>
            </section>

            {/* EXTENDED METRIC GRID (Drill Downs Connected) */}
            <section className="v2-grid-4 mb-8">
                {/* Row 1: Rates */}
                <MetricCard label="Ack Rate" value={formatPercent(metrics.ackRate)} detail="Acknowledgment" variant={metrics.ackRate > 90 ? 'success' : 'warning'} icon={<CheckCircle className="w-5 h-5 text-blue-500" />} href="/incidents?status=ACKNOWLEDGED" />
                <MetricCard label="Resolve Rate" value={formatPercent(metrics.resolveRate)} detail="Completion" variant={metrics.resolveRate > 80 ? 'success' : 'default'} icon={<CheckCircle className="w-5 h-5 text-green-500" />} href="/incidents?status=RESOLVED" />
                <MetricCard label="High Urgency" value={formatPercent(metrics.highUrgencyRate)} detail="Share of Total" variant={metrics.highUrgencyRate > 50 ? 'warning' : 'default'} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} href="/incidents?urgency=HIGH" />
                <MetricCard label="SLA Breaches" value={(metrics.ackBreaches + metrics.resolveBreaches).toString()} detail="Combined Misses" variant={metrics.ackBreaches + metrics.resolveBreaches > 0 ? 'danger' : 'success'} icon={<AlertCircle className="w-5 h-5" />} href="/incidents" />

                {/* Row 2: Operational */}
                <MetricCard label="Alerts" value={metrics.alertsCount.toLocaleString()} detail="Total Signals" variant="default" icon={<Bell className="w-5 h-5 text-gray-500" />} href="/alerts" />
                <MetricCard label="Noise Ratio" value={metrics.alertsPerIncident.toFixed(1) + 'x'} detail="Alerts/Incident" variant="default" icon={<Zap className="w-5 h-5 text-yellow-500" />} href="/alerts" />
                <MetricCard label="Unassigned" value={metrics.unassignedActive.toLocaleString()} detail="Needs Owner" variant={metrics.unassignedActive > 0 ? 'warning' : 'success'} icon={<Users className="w-5 h-5" />} href="/incidents?assignee=UNASSIGNED" />
                <MetricCard label="Escalation Rate" value={formatPercent(metrics.escalationRate)} detail="Incidents Escalated" variant={metrics.escalationRate > 20 ? 'warning' : 'default'} icon={<TrendingUp className="w-5 h-5" />} href="/incidents" />

                {/* Row 3: Coverage */}
                <MetricCard label="After Hours" value={formatPercent(metrics.afterHoursRate)} detail="Off-Business Hours" variant="default" icon={<Moon className="w-5 h-5 text-indigo-500" />} href="/on-call" />
                <MetricCard label="Coverage" value={formatPercent(metrics.coveragePercent)} detail="On-Call Schedule" variant={metrics.coveragePercent > 95 ? 'success' : 'danger'} icon={<Shield className="w-5 h-5" />} href="/on-call" />
                <MetricCard label="On-Call Hours" value={formatHours(metrics.onCallHoursMs)} detail="Total Scheduled" variant="primary" icon={<Clock className="w-5 h-5" />} href="/on-call" />
                <MetricCard label="MTBF" value={metrics.mtbfMs ? formatHours(metrics.mtbfMs) : '--'} detail="Mean Time Between" variant="default" icon={<Activity className="w-5 h-5" />} href="/incidents" />
            </section>

            {/* SPLIT ROW: Intelligent Insights & Response Trends */}
            <div className={`${showInsights ? 'v2-grid-split' : 'w-full'} mb-8`}>
                {/* INSIGHTS */}
                {showInsights && (
                    <div className="glass-panel p-4 h-full">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" /> Smart Insights
                        </h3>
                        <div className="flex flex-col gap-2">
                            {metrics.insights.slice(0, 5).map((insight, i) => (
                                <InsightCard key={i} type={insight.type} text={insight.text} />
                            ))}
                        </div>
                    </div>
                )}

                {/* CHART */}
                <div>
                    <ChartCard title={`Response Performance Trends (Last ${windowDays} Days)`}>
                        <div className="h-280">
                            <LineChart
                                data={metrics.trendSeries}
                                lines={[
                                    { key: 'mtta', color: '#f59e0b', label: 'MTTA (Response)' },
                                    { key: 'mttr', color: '#10b981', label: 'MTTR (Resolution)' }
                                ]}
                                height={280}
                                valueFormatter={(v: number) => formatTimeMinutesMs(v * 60000)}
                            />
                        </div>
                    </ChartCard>
                </div>
            </div>

            {/* OPERATIONAL MIX - 3 Cols */}
            <div className="v2-grid-3 mb-8">
                <ChartCard title="Incident Volume Trend">
                    <div className="h-200">
                        <BarChart data={metrics.trendSeries} maxValue={maxTrend} height={200} showValues />
                    </div>
                </ChartCard>
                <ChartCard title="Current Status Mix">
                    <div className="flex items-center gap-6 h-200">
                        <PieChart
                            data={metrics.statusMix.map(e => ({ label: e.status, value: e.count, color: getStatusColor(e.status) }))}
                            size={140}
                        />
                        <div className="flex flex-col gap-2 text-xs">
                            {metrics.statusMix.map(e => (
                                <div key={e.status} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getStatusColor(e.status) }} />
                                    <span>{e.status}</span>
                                    <span className="font-bold ml-auto">{e.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>
                <ChartCard title="Assignee Load">
                    <div className="flex flex-col gap-3 h-200 overflow-y-auto pr-2 custom-scrollbar">
                        {metrics.assigneeLoad.map((a, i) => (
                            <div key={a.id} className="flex items-center gap-3 p-1 rounded hover:bg-muted/50">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                                <span className="flex-1 text-sm truncate">{a.name}</span>
                                <span className="font-bold text-sm bg-muted px-2 rounded">{a.count}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>

            {/* SERVICE HEALTH MATRIX */}
            <section className="glass-panel mb-8 overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" /> Service Health Matrix
                    </h3>
                    <span className="text-xs text-muted-foreground">{metrics.serviceMetrics.length} Services Monitored</span>
                </div>
                <ServiceHealthTable services={metrics.serviceMetrics} />
            </section>

            {/* GAUGES */}
            <section className="mb-8">
                <div className="v2-section-header">
                    <h2 className="v2-section-title"><Shield className="w-5 h-5" /> SLA Compliance</h2>
                </div>
                <div className="v2-gauge-grid">
                    <div className="v2-gauge-card"><GaugeChart value={metrics.ackCompliance} label="Ack SLA" size={120} /></div>
                    <div className="v2-gauge-card"><GaugeChart value={metrics.resolveCompliance} label="Resolve SLA" size={120} /></div>
                    <div className="v2-gauge-card"><GaugeChart value={metrics.coveragePercent} label="Coverage" size={120} /></div>
                    <div className="v2-gauge-card"><GaugeChart value={metrics.ackRate} label="Ack Rate" size={120} /></div>
                </div>
            </section>

            {/* HEATMAP */}
            <section className="glass-panel p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-muted-foreground" /> Historical Activity (12 Weeks)
                </h3>
                <HeatmapCalendar data={metrics.heatmapData} weeks={12} cellSize={16} gap={4} />
            </section>
        </main>
    );
}
