'use client';

import { useMemo } from 'react';
import { SLAMetrics } from '@/lib/sla';
import { formatTimeMinutesMs } from '@/lib/time-format';
import {
    Activity,
    Clock,
    AlertCircle,
    Server,
    Shield,
    Zap,
    CheckCircle,
    XCircle,
    Timer,
    TrendingUp,
    Gauge
} from 'lucide-react';
import MetricCard from '@/components/analytics/MetricCard';
import ChartCard from '@/components/analytics/ChartCard';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadialBarChart,
    RadialBar,
    Legend
} from 'recharts';

interface MonitoringDashboardV2Props {
    metrics: SLAMetrics;
}

/**
 * Monitoring Dashboard V2
 * Displays ALL metrics from the new `calculateSLAMetrics` service.
 */
export default function MonitoringDashboardV2({ metrics }: MonitoringDashboardV2Props) {

    // Helper: Determine status variant based on value
    const getLatencyStatus = (val: number | null) => {
        if (val === null) return 'default';
        if (val < 200) return 'success';
        if (val < 500) return 'warning';
        return 'danger';
    };

    const getErrorRateStatus = (val: number | null) => {
        if (val === null) return 'default';
        if (val < 0.1) return 'success';
        if (val < 1.0) return 'warning';
        return 'danger';
    };

    const getComplianceStatus = (val: number) => {
        if (val >= 95) return 'success';
        if (val >= 80) return 'warning';
        return 'danger';
    };

    // Derived Values
    const uptimeValue = metrics.errorRate !== null ? (100 - metrics.errorRate) : null;

    // Radial Chart Data for Compliance
    const complianceData = [
        { name: 'Ack SLA', value: metrics.ackCompliance, fill: '#22c55e' },
        { name: 'Resolve SLA', value: metrics.resolveCompliance, fill: '#3b82f6' },
    ];

    // Bar Chart for Time Metrics
    const timeMetricsData = useMemo(() => [
        { name: 'MTTR', value: metrics.mttr !== null ? metrics.mttr : 0, fill: '#ef4444' },
        { name: 'MTTD', value: metrics.mttd !== null ? metrics.mttd : 0, fill: '#f97316' },
        { name: 'MTTI', value: metrics.mtti !== null ? metrics.mtti : 0, fill: '#eab308' },
        { name: 'MTTK', value: metrics.mttk !== null ? metrics.mttk : 0, fill: '#a855f7' },
    ], [metrics]);

    return (
        <div className="space-y-10">

            {/* SECTION 1: GOLDEN SIGNALS */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-neutral-300 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Golden Signals (Application Health)
                </h2>
                <div className="analytics-grid">
                    <MetricCard
                        label="Latency (P99)"
                        value={metrics.avgLatencyP99 !== null ? `${metrics.avgLatencyP99}ms` : '--'}
                        detail="99th percentile"
                        variant={getLatencyStatus(metrics.avgLatencyP99) as any}
                        icon={<Clock className="w-5 h-5" />}
                        tooltip="Response time for 99% of requests"
                    />
                    <MetricCard
                        label="Error Rate"
                        value={metrics.errorRate !== null ? `${metrics.errorRate.toFixed(2)}%` : '--'}
                        detail="5xx errors"
                        variant={getErrorRateStatus(metrics.errorRate) as any}
                        icon={<AlertCircle className="w-5 h-5" />}
                        tooltip="Percentage of failed requests"
                    />
                    <MetricCard
                        label="Throughput"
                        value={metrics.totalRequests.toLocaleString()}
                        detail="Total requests"
                        variant="primary"
                        icon={<TrendingUp className="w-5 h-5" />}
                        tooltip="Total HTTP request volume"
                    />
                    <MetricCard
                        label="Saturation"
                        value={metrics.saturation !== null ? `${metrics.saturation.toFixed(1)}%` : '--'}
                        detail="Resource usage"
                        variant={metrics.saturation !== null && metrics.saturation > 80 ? 'danger' : 'success'}
                        icon={<Gauge className="w-5 h-5" />}
                        tooltip="CPU/Memory utilization"
                    />
                    <MetricCard
                        label="Availability"
                        value={uptimeValue !== null ? `${uptimeValue.toFixed(3)}%` : '--'}
                        detail="Uptime SLA"
                        variant={uptimeValue !== null && uptimeValue >= 99.9 ? 'success' : 'danger'}
                        icon={<Server className="w-5 h-5" />}
                        tooltip="Implied uptime based on error rate"
                    />
                </div>
            </section>

            <div className="border-t border-neutral-800"></div>

            {/* SECTION 2: INCIDENT LIFECYCLE METRICS */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-neutral-300 flex items-center gap-2">
                    <Timer className="w-5 h-5 text-orange-400" />
                    Incident Lifecycle Metrics
                </h2>
                <div className="analytics-grid">
                    <MetricCard
                        label="MTTR"
                        value={metrics.mttr !== null ? formatTimeMinutesMs(metrics.mttr * 60 * 1000) : '--'}
                        detail="Mean Time To Resolve"
                        variant={metrics.mttr !== null && metrics.mttr < 60 ? 'success' : 'warning'}
                        icon={<Zap className="w-5 h-5 text-green-400" />}
                        tooltip="Average time to resolve incidents"
                    />
                    <MetricCard
                        label="MTTD"
                        value={metrics.mttd !== null ? formatTimeMinutesMs(metrics.mttd * 60 * 1000) : '--'}
                        detail="Mean Time To Detect"
                        icon={<Clock className="w-5 h-5 text-yellow-400" />}
                        tooltip="Average time to detect an issue"
                    />
                    <MetricCard
                        label="MTTI"
                        value={metrics.mtti !== null ? formatTimeMinutesMs(metrics.mtti * 60 * 1000) : '--'}
                        detail="Mean Time To Investigate"
                        icon={<Clock className="w-5 h-5 text-orange-400" />}
                        tooltip="Time from creation to first investigation action"
                    />
                    <MetricCard
                        label="MTTK"
                        value={metrics.mttk !== null ? formatTimeMinutesMs(metrics.mttk * 60 * 1000) : '--'}
                        detail="Mean Time To Know"
                        icon={<Clock className="w-5 h-5 text-purple-400" />}
                        tooltip="Time to understand incident root cause"
                    />
                </div>
                <div className="mt-6">
                    <ChartCard title="Time Metrics Comparison (minutes)">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={timeMetricsData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis type="number" stroke="#666" tick={{ fill: '#888' }} />
                                <YAxis type="category" dataKey="name" stroke="#666" tick={{ fill: '#888' }} width={60} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333' }}
                                    formatter={(value: number) => [`${value.toFixed(1)} min`, 'Duration']}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </section>

            <div className="border-t border-neutral-800"></div>

            {/* SECTION 3: SLA COMPLIANCE */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-neutral-300 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    SLA Compliance
                </h2>
                <div className="analytics-grid">
                    <MetricCard
                        label="Ack Compliance"
                        value={`${metrics.ackCompliance.toFixed(1)}%`}
                        detail={`${metrics.ackBreaches} breaches`}
                        variant={getComplianceStatus(metrics.ackCompliance) as any}
                        icon={<CheckCircle className="w-5 h-5" />}
                        tooltip="Percentage of incidents acknowledged within SLA"
                    />
                    <MetricCard
                        label="Resolve Compliance"
                        value={`${metrics.resolveCompliance.toFixed(1)}%`}
                        detail={`${metrics.resolveBreaches} breaches`}
                        variant={getComplianceStatus(metrics.resolveCompliance) as any}
                        icon={<CheckCircle className="w-5 h-5" />}
                        tooltip="Percentage of incidents resolved within SLA"
                    />
                    <MetricCard
                        label="Total Incidents"
                        value={metrics.totalIncidents.toLocaleString()}
                        detail="In selected period"
                        variant="default"
                        icon={<AlertCircle className="w-5 h-5" />}
                    />
                    <MetricCard
                        label="Ack Breaches"
                        value={metrics.ackBreaches.toLocaleString()}
                        detail="SLA violations"
                        variant={metrics.ackBreaches > 0 ? 'danger' : 'success'}
                        icon={<XCircle className="w-5 h-5" />}
                    />
                    <MetricCard
                        label="Resolve Breaches"
                        value={metrics.resolveBreaches.toLocaleString()}
                        detail="SLA violations"
                        variant={metrics.resolveBreaches > 0 ? 'danger' : 'success'}
                        icon={<XCircle className="w-5 h-5" />}
                    />

                    {/* Radial Chart for Compliance */}
                    <div className="col-span-1 lg:col-span-2">
                        <ChartCard title="SLA Performance">
                            <ResponsiveContainer width="100%" height={220}>
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="20%"
                                    outerRadius="90%"
                                    barSize={20}
                                    data={complianceData}
                                    startAngle={180}
                                    endAngle={0}
                                >
                                    <RadialBar
                                        label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }}
                                        dataKey="value"
                                        background={{ fill: '#333' }}
                                    />
                                    <Legend
                                        iconSize={10}
                                        layout="horizontal"
                                        verticalAlign="bottom"
                                        wrapperStyle={{ paddingTop: 10 }}
                                    />
                                    <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333' }} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </div>
            </section>

        </div>
    );
}
