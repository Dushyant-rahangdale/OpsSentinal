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
  description: 'High-Level Operational Health Overview',
};

export default async function ExecutiveReportPage() {
  await assertAdmin();

  // Fetch metrics for multiple time windows
  // Fetch metrics for multiple time windows
  const [last7d, last30d, last90d] = await Promise.all([
    calculateSLAMetrics({ windowDays: 7 }),
    calculateSLAMetrics({ windowDays: 30 }),
    calculateSLAMetrics({ windowDays: 90 }),
  ]);

  const dayMs = 24 * 60 * 60 * 1000;

  const getEffectiveDays = (metrics: { effectiveStart: Date; effectiveEnd: Date }) =>
    Math.max(
      1,
      Math.ceil((metrics.effectiveEnd.getTime() - metrics.effectiveStart.getTime()) / dayMs)
    );

  // Calculate trends
  const incidentTrend =
    last30d.totalIncidents > 0 && last7d.totalIncidents > 0
      ? (last7d.totalIncidents / 7 / (last30d.totalIncidents / 30) - 1) * 100
      : 0;

  const mttrTrend =
    last30d.mttr !== null && last7d.mttr !== null && last30d.mttr > 0
      ? ((last7d.mttr - last30d.mttr) / last30d.mttr) * 100
      : 0;

  const buildWindowLabel = (
    metrics: { effectiveStart: Date; effectiveEnd: Date; isClipped: boolean },
    requestedDays: number
  ) => {
    const effectiveDays = metrics.isClipped
      ? Math.max(
          1,
          Math.ceil((metrics.effectiveEnd.getTime() - metrics.effectiveStart.getTime()) / dayMs)
        )
      : requestedDays;
    return {
      label: `${effectiveDays}d`,
      suffix: metrics.isClipped ? ' (retention limit)' : '',
    };
  };

  const last7dLabel = buildWindowLabel(last7d, 7);
  const last30dLabel = buildWindowLabel(last30d, 30);

  const formatPercent = (val: number | null) => (val === null ? '--' : `${val.toFixed(1)}%`);
  const complianceVariant = (val: number | null) => {
    if (val === null) return 'default';
    return val >= 95 ? 'success' : val >= 80 ? 'warning' : 'danger';
  };
  const formatMinutes = (val: number | null) => (val === null ? '--' : `${val.toFixed(1)}m`);
  const formatTrend = (val: number) => (val > 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`);

  return (
    <main className="page-shell analytics-shell">
      <div
        className="analytics-hero-redesigned"
        style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(139, 92, 246, 0.1))',
        }}
      >
        <div className="analytics-hero-inner">
          <div className="analytics-hero-left">
            <p className="schedule-eyebrow" style={{ color: '#a78bfa' }}>
              Executive Report
            </p>
            <h1 style={{ fontSize: '2rem' }}>Operational Health Overview</h1>
          </div>
          <div
            className="analytics-hero-right"
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}
          >
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY */}
      <section
        className="glass-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
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
          variant={
            last7d.ackCompliance >= 95
              ? 'success'
              : last7d.ackCompliance >= 80
                ? 'warning'
                : 'danger'
          }
          icon={<Shield className="w-5 h-5" />}
        >
          <div style={{ marginTop: '0.75rem' }}>
            <ProgressBar
              value={last7d.ackCompliance}
              variant={last7d.ackCompliance >= 95 ? 'success' : 'warning'}
              size="sm"
            />
          </div>
        </MetricCard>
        <MetricCard
          label="On-Call Coverage"
          value={formatPercent(last7d.coveragePercent)}
          detail="Next 14 days"
          variant={
            last7d.coveragePercent >= 100
              ? 'success'
              : last7d.coveragePercent >= 80
                ? 'warning'
                : 'danger'
          }
          icon={<Users className="w-5 h-5" />}
        >
          <div style={{ marginTop: '0.75rem' }}>
            <ProgressBar
              value={last7d.coveragePercent}
              variant={last7d.coveragePercent >= 100 ? 'success' : 'warning'}
              size="sm"
            />
          </div>
        </MetricCard>
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
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 8,
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                Resolve Rate (7d)
              </p>
              <p style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 700 }}>
                {formatPercent(last7d.resolveRate)}
              </p>
            </div>
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 8,
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Ack Rate (7d)</p>
              <p style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700 }}>
                {formatPercent(last7d.ackRate)}
              </p>
            </div>
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: 8,
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                After-Hours (7d)
              </p>
              <p style={{ color: '#a78bfa', fontSize: '1.5rem', fontWeight: 700 }}>
                {formatPercent(last7d.afterHoursRate)}
              </p>
            </div>
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'rgba(234, 179, 8, 0.1)',
                borderRadius: 8,
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                Escalation Rate (7d)
              </p>
              <p style={{ color: '#eab308', fontSize: '1.5rem', fontWeight: 700 }}>
                {formatPercent(last7d.escalationRate)}
              </p>
            </div>
          </div>
        </ChartCard>
      </section>
    </main>
  );
}
