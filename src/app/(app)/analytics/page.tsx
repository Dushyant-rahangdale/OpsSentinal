import prisma from '@/lib/prisma';
import Link from 'next/link';

const formatMinutes = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000 / 60).toFixed(1)}m`);
const formatPercent = (value: number) => `${value.toFixed(0)}%`;

export default async function AnalyticsPage() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const coverageWindowDays = 14;
    const coverageWindowEnd = new Date(now);
    coverageWindowEnd.setDate(now.getDate() + coverageWindowDays);

    const [
        openIncidents,
        recentIncidents,
        alertsLastWeek,
        futureShifts,
        activeOverrides,
        statusTrends,
        eventsLastWeek,
        ackEvents
    ] = await Promise.all([
        prisma.incident.count({ where: { status: 'OPEN' } }),
        prisma.incident.findMany({
            where: { createdAt: { gte: weekAgo } },
            select: { id: true, createdAt: true, updatedAt: true, status: true, urgency: true }
        }),
        prisma.alert.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.onCallShift.findMany({
            where: { end: { gte: now } },
            select: { start: true, end: true }
        }),
        prisma.onCallOverride.count({ where: { end: { gte: now } } }),
        prisma.incident.groupBy({
            by: ['status'],
            where: { createdAt: { gte: weekAgo } },
            _count: { _all: true }
        }),
        prisma.incidentEvent.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.incidentEvent.groupBy({
            by: ['incidentId'],
            where: { createdAt: { gte: weekAgo } },
            _min: { createdAt: true }
        })
    ]);

    const incidentMap = new Map(recentIncidents.map((incident) => [incident.id, incident]));
    const ackDiffs: number[] = [];
    for (const ack of ackEvents) {
        const incident = incidentMap.get(ack.incidentId);
        if (incident && ack._min.createdAt && incident.createdAt) {
            ackDiffs.push(ack._min.createdAt.getTime() - incident.createdAt.getTime());
        }
    }
    const mttaMs = ackDiffs.length ? ackDiffs.reduce((sum, diff) => sum + diff, 0) / ackDiffs.length : null;

    const resolvedIncidents = recentIncidents.filter((incident) => incident.status === 'RESOLVED');
    const resolvedDiffs = resolvedIncidents.map((incident) => {
        if (incident.updatedAt && incident.createdAt) {
            return incident.updatedAt.getTime() - incident.createdAt.getTime();
        }
        return null;
    }).filter((diff): diff is number => diff !== null);
    const mttrMs = resolvedDiffs.length ? resolvedDiffs.reduce((sum, diff) => sum + diff, 0) / resolvedDiffs.length : null;

    const urgencyHigh = recentIncidents.filter((incident) => incident.urgency === 'HIGH').length;

    const coverageDays = new Set<string>();
    for (const shift of futureShifts) {
        const shiftStart = shift.start < now ? now : shift.start;
        const shiftEnd = shift.end > coverageWindowEnd ? coverageWindowEnd : shift.end;
        let cursor = new Date(shiftStart);
        while (cursor <= shiftEnd) {
            coverageDays.add(cursor.toDateString());
            cursor.setDate(cursor.getDate() + 1);
        }
    }
    const coveragePercent = Math.min(100, (coverageDays.size / coverageWindowDays) * 100);

    const metricCards = [
        { label: 'Active incidents', value: openIncidents.toLocaleString(), detail: 'Currently open' },
        { label: 'MTTA', value: formatMinutes(mttaMs), detail: 'Avg ack time (last 7d)' },
        { label: 'MTTR', value: formatMinutes(mttrMs), detail: 'Avg resolve time (last 7d)' },
        { label: 'Alerts (7d)', value: alertsLastWeek.toLocaleString(), detail: 'Incoming alerts' },
        { label: 'Coverage', value: formatPercent(coveragePercent), detail: 'Next 14 days with a shift' },
        { label: 'High urgency', value: urgencyHigh.toLocaleString(), detail: 'Priority incidents (7d)' },
        { label: 'Overrides', value: activeOverrides.toLocaleString(), detail: 'Active temporary coverage' },
        { label: 'Events', value: eventsLastWeek.toLocaleString(), detail: 'Incident events logged' }
    ];

    return (
        <main className="page-shell">
            <header className="page-header">
                <div>
                    <p className="schedule-eyebrow">Analytics</p>
                    <h1>Operational readiness</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        PagerDuty-style metrics for coverage, response speed, and alerts across your roster.
                    </p>
                </div>
                <Link href="/schedules" className="glass-button primary">
                    View schedules
                </Link>
            </header>

            <section className="glass-panel analytics-grid">
                {metricCards.map((metric) => (
                    <article key={metric.label} className="analytics-card">
                        <span className="analytics-label">{metric.label}</span>
                        <span className="analytics-value">{metric.value}</span>
                        <span className="analytics-detail">{metric.detail}</span>
                    </article>
                ))}
            </section>

            <section className="glass-panel analytics-charts">
                <div className="analytics-chart">
                    <div className="chart-title">Incident status mix</div>
                    <div className="chart-preview">
                        {statusTrends.map((entry) => (
                            <div key={entry.status}>
                                {entry.status}: {entry._count._all}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="analytics-chart">
                    <div className="chart-title">Coverage forecast</div>
                    <div className="chart-preview">
                        {`Shifts covering next ${coverageWindowDays} days: ${coverageDays.size}`}
                    </div>
                </div>
            </section>
        </main>
    );
}
