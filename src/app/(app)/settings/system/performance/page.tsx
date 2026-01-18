import { assertAdmin } from '@/lib/rbac';
import { Metadata } from 'next';
import Link from 'next/link';
import { Activity, Zap, Clock, AlertTriangle, TrendingUp, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Performance Monitoring | Admin | OpsKnight',
  description: 'System performance monitoring and metrics',
};

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  await assertAdmin();

  let slaMetrics = {
    period: '24h',
    queryCount: 0,
    avgDuration: null as number | null,
    p50Duration: null as number | null,
    p95Duration: null as number | null,
    slowQueryCount: 0,
    avgIncidentCount: null as number | null,
  };

  let dataSource = 'loading...';

  try {
    const prisma = (await import('@/lib/prisma')).default;

    // Use raw SQL to bypass Prisma client cache issues
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await prisma.$queryRaw<Array<{ durationMs: number; incidentCount: number }>>`
      SELECT "durationMs", "incidentCount" 
      FROM sla_performance_logs 
      WHERE timestamp >= ${since}
      ORDER BY timestamp DESC
    `;

    // Calculate metrics from logs
    const durations = logs.map(l => l.durationMs).sort((a, b) => a - b);
    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    const p50Duration = durations[Math.floor(durations.length * 0.5)] || null;
    const p95Duration = durations[Math.floor(durations.length * 0.95)] || null;
    const slowQueryCount = durations.filter(d => d > 10000).length;
    const avgIncidentCount =
      logs.length > 0 ? logs.reduce((sum, l) => sum + l.incidentCount, 0) / logs.length : null;

    slaMetrics = {
      period: '24h',
      queryCount: logs.length,
      avgDuration,
      p50Duration,
      p95Duration,
      slowQueryCount,
      avgIncidentCount,
    };

    dataSource =
      logs.length > 0
        ? `real-time (${logs.length} queries logged)`
        : 'real-time (no queries yet - navigate around to generate data)';
  } catch (error) {
    // Table might not exist yet
    console.warn('Performance metrics unavailable:', error);
    dataSource = 'database table not found - run npx prisma db push';
  }

  const recommendations = [
    'Use service or team filters to reduce query scope',
    'Consider using rollup data for queries >90 days',
    'Use the /api/sla/stream endpoint for datasets >50k incidents',
    'Ensure database indexes are applied via Prisma migration',
  ];

  return (
    <main className="page-shell" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link
          href="/settings/system"
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            transition: 'color 0.2s',
          }}
          className="dashboard-link-hover"
        >
          ← Back to System Settings
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Activity style={{ width: '24px', height: '24px', color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: '700' }}>
              Performance Monitoring
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
              Real-time system performance metrics and optimization insights
            </p>
          </div>
        </div>
      </div>

      {/* SLA Query Performance Section */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}
        >
          <Database style={{ width: '20px', height: '20px', color: 'var(--primary-color)' }} />
          <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '600' }}>
            SLA Query Performance
          </h2>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          {/* Query Count */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              background:
                'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.02) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              borderRadius: '12px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                Total Queries ({slaMetrics.period})
              </div>
            </div>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              {slaMetrics.queryCount.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              • Tracking query performance
            </div>
          </div>

          {/* Average Duration */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              background:
                'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.1)',
              borderRadius: '12px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                Avg Duration
              </div>
            </div>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              {slaMetrics.avgDuration !== null ? `${slaMetrics.avgDuration.toFixed(0)}ms` : 'N/A'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Mean query time</div>
          </div>

          {/* P95 Duration */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              background:
                'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(245, 158, 11, 0.02) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.1)',
              borderRadius: '12px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                P95 Duration
              </div>
            </div>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              {slaMetrics.p95Duration !== null ? `${slaMetrics.p95Duration.toFixed(0)}ms` : 'N/A'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              • 95th percentile latency
            </div>
          </div>

          {/* Slow Queries */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              background:
                'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                Slow Queries (&gt;10s)
              </div>
            </div>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: slaMetrics.slowQueryCount > 0 ? '#ef4444' : '#22c55e',
                marginBottom: '0.5rem',
              }}
            >
              {slaMetrics.slowQueryCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              • Queries exceeding threshold
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div
          className="glass-panel"
          style={{
            padding: '2rem',
            background:
              'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(99, 102, 241, 0.01) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
            borderRadius: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '600' }}>
              Optimization Recommendations
            </h3>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem 1.25rem',
                  background: 'white',
                  borderLeft: '3px solid #8b5cf6',
                  borderRadius: '8px',
                  fontSize: '0.925rem',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'default',
                }}
              >
                {rec}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Metadata */}
      <div
        style={{
          padding: '1rem 1.5rem',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <strong>Data Source:</strong> {dataSource}
        </div>
        <div>
          <strong>Last Updated:</strong> {new Date().toLocaleString()}
        </div>
      </div>
    </main>
  );
}
