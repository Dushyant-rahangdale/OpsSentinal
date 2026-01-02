import { calculateSLAMetrics } from '@/lib/sla-server';
import { assertAdmin } from '@/lib/rbac';
import { Metadata } from 'next';
import MetricCard from '@/components/analytics/MetricCard';
import RadialProgress from '@/components/analytics/RadialProgress';
import { Clock, AlertCircle, TrendingUp, Gauge, Server, Activity } from 'lucide-react';
import '../analytics-new/analytics-v2.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Monitoring V2 | OpsSentinel',
    description: 'Application Health - Golden Signals'
};

type SearchParams = { range?: string; service?: string };

export default async function MonitoringV2Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
    await assertAdmin();

    const params = await searchParams;
    const range = params?.range as string | undefined;
    const serviceId = params?.service as string | undefined;

    let windowDays = 7;
    if (range === '30d') windowDays = 30;
    else if (range === '90d') windowDays = 90;

    const metrics = await calculateSLAMetrics({ serviceId, windowDays });

    // Derived Values
    const uptimeValue = metrics.errorRate !== null ? (100 - metrics.errorRate) : null;
    const getLatencyStatus = (val: number | null) => val === null ? 'default' : val < 200 ? 'success' : val < 500 ? 'warning' : 'danger';
    const getErrorRateStatus = (val: number | null) => val === null ? 'default' : val < 0.1 ? 'success' : val < 1.0 ? 'warning' : 'danger';

    return (
        <main className="page-shell analytics-shell">
            <div className="analytics-hero-redesigned">
                <div className="analytics-hero-inner">
                    <div className="analytics-hero-left">
                        <p className="schedule-eyebrow">Application Health</p>
                        <h1>Golden Signals</h1>
                    </div>
                </div>
            </div>

            <section className="glass-panel">
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

            {/* VISUAL GAUGES */}
            <section className="v2-section" style={{ marginTop: '2rem' }}>
                <div className="v2-section-header">
                    <h2 className="v2-section-title"><Activity className="w-5 h-5" style={{ color: '#a78bfa' }} /> Health Overview</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
                    <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem' }}>
                        <RadialProgress value={uptimeValue ?? 0} max={100} size={100} label="Uptime" variant={uptimeValue !== null && uptimeValue >= 99.9 ? 'success' : 'danger'} />
                    </div>
                    <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem' }}>
                        <RadialProgress value={100 - (metrics.errorRate ?? 0)} max={100} size={100} label="Success" variant={(metrics.errorRate ?? 0) < 1 ? 'success' : 'danger'} />
                    </div>
                    <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem' }}>
                        <RadialProgress value={100 - (metrics.saturation ?? 0)} max={100} size={100} label="Capacity" variant={(metrics.saturation ?? 0) < 80 ? 'success' : 'danger'} />
                    </div>
                </div>
            </section>

            <section className="glass-panel" style={{ marginTop: '1.5rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                    💡 Golden Signal data requires the MetricRollup pipeline to be active. Currently showing placeholder values.
                </p>
            </section>
        </main>
    );
}
