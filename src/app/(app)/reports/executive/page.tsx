import { calculateSLAMetrics } from '@/lib/sla-server';
import { assertAdmin } from '@/lib/rbac';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import MetricCard from '@/components/analytics/MetricCard';
import ChartCard from '@/components/analytics/ChartCard';
import ProgressBar from '@/components/analytics/ProgressBar';
import BarChart from '@/components/analytics/BarChart';
import { Shield, TrendingUp, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Executive Report | OpsSentinel',
    description: 'High-Level Operational Health Overview'
};

export default async function ExecutiveReportPage() {
    await assertAdmin();

    // Fetch metrics for multiple time windows
    const [last7d, last30d, last90d, slaDefinitions] = await Promise.all([
        calculateSLAMetrics({ windowDays: 7 }),
        calculateSLAMetrics({ windowDays: 30 }),
        calculateSLAMetrics({ windowDays: 90 }),
        prisma.sLADefinition.findMany({
            where: { activeTo: null },
            include: {
                service: { select: { name: true } },
                snapshots: {
                    orderBy: { date: 'desc' },
                    take: 30,
                    select: { date: true, uptimePercentage: true, breachCount: true }
                }
            }
        })
    ]);

    // Calculate trends
    const incidentTrend = last30d.totalIncidents > 0 && last7d.totalIncidents > 0
        ? ((last7d.totalIncidents / 7) / (last30d.totalIncidents / 30) - 1) * 100
        : 0;

    const mttrTrend = last30d.mttr !== null && last7d.mttr !== null && last30d.mttr > 0
        ? ((last7d.mttr - last30d.mttr) / last30d.mttr) * 100
        : 0;

    // SLA Scorecard
    const slaScorecard = slaDefinitions.map(def => {
        const avgUptime = def.snapshots.length > 0
            ? def.snapshots.reduce((sum, s) => sum + s.uptimePercentage, 0) / def.snapshots.length
            : 100;
        const totalBreaches = def.snapshots.reduce((sum, s) => sum + s.breachCount, 0);
        const metStatus = avgUptime >= def.target;
        return {
            id: def.id,
            name: def.name,
            service: def.service.name,
            target: def.target,
            actual: avgUptime,
            breaches: totalBreaches,
            met: metStatus
        };
    });

    const formatPercent = (val: number) => `${val.toFixed(1)}%`;
    const formatMinutes = (val: number | null) => val === null ? '--' : `${val.toFixed(1)}m`;
    const formatTrend = (val: number) => val > 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;

    return (
        <main className="page-shell analytics-shell">
            <div className="analytics-hero-redesigned" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(139, 92, 246, 0.1))' }}>
                <div className="analytics-hero-inner">
                    <div className="analytics-hero-left">
                        <p className="schedule-eyebrow" style={{ color: '#a78bfa' }}>Executive Report</p>
                        <h1 style={{ fontSize: '2rem' }}>Operational Health Overview</h1>
                    </div>
                    <div className="analytics-hero-right" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                        Last updated: {new Date().toLocaleString()}
                    </div>
                </div>
            </div>

            {/* EXECUTIVE SUMMARY */}
            <section className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <MetricCard
                    label="Incidents (7d)"
                    value={last7d.totalIncidents.toString()}
                    detail={formatTrend(incidentTrend) + ' vs avg'}
                    variant={incidentTrend < 0 ? 'success' : incidentTrend > 20 ? 'danger' : 'default'}
                    icon={<AlertCircle className="w-5 h-5" />}
                />
                <MetricCard
                    label="MTTR (7d)"
                    value={formatMinutes(last7d.mttr)}
                    detail={formatTrend(mttrTrend) + ' vs 30d'}
                    variant={mttrTrend < 0 ? 'success' : mttrTrend > 20 ? 'danger' : 'default'}
                    icon={<Clock className="w-5 h-5" />}
                />
                <MetricCard
                    label="SLA Compliance"
                    value={formatPercent(last7d.ackCompliance)}
                    detail="Acknowledgement"
                    variant={last7d.ackCompliance >= 95 ? 'success' : last7d.ackCompliance >= 80 ? 'warning' : 'danger'}
                    icon={<Shield className="w-5 h-5" />}
                >
                    <div style={{ marginTop: '0.75rem' }}>
                        <ProgressBar value={last7d.ackCompliance} variant={last7d.ackCompliance >= 95 ? 'success' : 'warning'} size="sm" />
                    </div>
                </MetricCard>
                <MetricCard
                    label="On-Call Coverage"
                    value={formatPercent(last7d.coveragePercent)}
                    detail="Next 14 days"
                    variant={last7d.coveragePercent >= 100 ? 'success' : last7d.coveragePercent >= 80 ? 'warning' : 'danger'}
                    icon={<Users className="w-5 h-5" />}
                >
                    <div style={{ marginTop: '0.75rem' }}>
                        <ProgressBar value={last7d.coveragePercent} variant={last7d.coveragePercent >= 100 ? 'success' : 'warning'} size="sm" />
                    </div>
                </MetricCard>
            </section>

            {/* SLA SCORECARD */}
            <section className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield className="w-5 h-5" style={{ color: '#a78bfa' }} />
                    SLA Scorecard
                </h2>
                {slaScorecard.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>
                        No SLA definitions configured. <a href="/settings/sla" style={{ color: '#a78bfa' }}>Create one →</a>
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 500 }}>SLA</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 500 }}>Service</th>
                                    <th style={{ textAlign: 'right', padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 500 }}>Target</th>
                                    <th style={{ textAlign: 'right', padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 500 }}>Actual (30d)</th>
                                    <th style={{ textAlign: 'right', padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 500 }}>Breaches</th>
                                    <th style={{ textAlign: 'center', padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 500 }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slaScorecard.map(sla => (
                                    <tr key={sla.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem', color: 'white', fontWeight: 500 }}>{sla.name}</td>
                                        <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>{sla.service}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'rgba(255,255,255,0.8)' }}>{sla.target}%</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: sla.met ? '#22c55e' : '#ef4444' }}>{sla.actual.toFixed(2)}%</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', color: sla.breaches > 0 ? '#ef4444' : 'rgba(255,255,255,0.6)' }}>{sla.breaches}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                            {sla.met ? (
                                                <CheckCircle className="w-5 h-5" style={{ color: '#22c55e' }} />
                                            ) : (
                                                <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* INCIDENT TREND */}
            <section className="glass-panel analytics-charts">
                <ChartCard title="Incident Volume (Last 30 Days)" subtitle="Daily incident count">
                    <BarChart
                        data={last30d.trendSeries}
                        maxValue={Math.max(1, ...last30d.trendSeries.map(e => e.count))}
                        height={200}
                    />
                </ChartCard>
                <ChartCard title="Key Metrics Comparison">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8 }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Resolve Rate (7d)</p>
                            <p style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 700 }}>{formatPercent(last7d.resolveRate)}</p>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Ack Rate (7d)</p>
                            <p style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700 }}>{formatPercent(last7d.ackRate)}</p>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8 }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>After-Hours (7d)</p>
                            <p style={{ color: '#a78bfa', fontSize: '1.5rem', fontWeight: 700 }}>{formatPercent(last7d.afterHoursRate)}</p>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', borderRadius: 8 }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Escalation Rate (7d)</p>
                            <p style={{ color: '#eab308', fontSize: '1.5rem', fontWeight: 700 }}>{formatPercent(last7d.escalationRate)}</p>
                        </div>
                    </div>
                </ChartCard>
            </section>
        </main>
    );
}
