import prisma from '@/lib/prisma';
import MobileCard from '@/components/mobile/MobileCard';

export const dynamic = 'force-dynamic';

export default async function MobileAnalyticsPage() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        openIncidents,
        incidents7d
    ] = await Promise.all([
        prisma.incident.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] } } }),
        prisma.incident.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: {
                createdAt: true,
                acknowledgedAt: true,
                resolvedAt: true,
                updatedAt: true,
                status: true
            }
        })
    ]);

    // Calculate MTTA / MTTR for last 7 days
    let mttaSum = 0, mttaCount = 0;
    let mttrSum = 0, mttrCount = 0;

    incidents7d.forEach(inc => {
        if (inc.acknowledgedAt) {
            mttaSum += inc.acknowledgedAt.getTime() - inc.createdAt.getTime();
            mttaCount++;
        }
        if (inc.status === 'RESOLVED') {
            // Use resolvedAt or updatedAt as fallback
            const resolvedTime = inc.resolvedAt || inc.updatedAt;
            mttrSum += resolvedTime.getTime() - inc.createdAt.getTime();
            mttrCount++;
        }
    });

    const mtta = mttaCount ? mttaSum / mttaCount : 0;
    const mttr = mttrCount ? mttrSum / mttrCount : 0;

    const formatDuration = (ms: number) => {
        if (ms === 0) return '--';
        const mins = Math.round(ms / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = (mins / 60).toFixed(1);
        return `${hours}h`;
    };

    return (
        <div className="mobile-dashboard">
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Analytics</h1>

            <div className="mobile-metrics-grid">
                <MobileCard className="mobile-metric-card">
                    <div className="mobile-metric-value">{openIncidents}</div>
                    <div className="mobile-metric-label">Open Incidents</div>
                </MobileCard>
                <MobileCard className="mobile-metric-card">
                    <div className="mobile-metric-value">{incidents7d.length}</div>
                    <div className="mobile-metric-label">New (7d)</div>
                </MobileCard>
                <MobileCard className="mobile-metric-card">
                    <div className="mobile-metric-value">{formatDuration(mtta)}</div>
                    <div className="mobile-metric-label">MTTA (7d)</div>
                </MobileCard>
                <MobileCard className="mobile-metric-card">
                    <div className="mobile-metric-value">{formatDuration(mttr)}</div>
                    <div className="mobile-metric-label">MTTR (7d)</div>
                </MobileCard>
            </div>

            <div style={{ marginTop: '1.5rem', padding: '0 0.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Metrics are calculated based on the last 7 days of activity. For detailed reports and custom ranges, please use the desktop dashboard.
                </p>
            </div>
        </div>
    );
}
