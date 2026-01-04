import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function MobileDashboard() {
  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id;

  // Fetch key metrics and on-call status
  const { calculateSLAMetrics } = await import('@/lib/sla-server');
  const slaMetrics = await calculateSLAMetrics({ includeAllTime: true });

  const [currentOnCallShift] = await Promise.all([
    // Check if current user is on-call
    userId
      ? prisma.onCallShift.findFirst({
          where: {
            userId,
            start: { lte: new Date() },
            end: { gte: new Date() },
          },
          include: {
            schedule: { select: { name: true } },
          },
        })
      : null,
  ]);

  const openIncidents = slaMetrics.openCount;
  const criticalIncidents = slaMetrics.criticalCount;

  // Use the last trend point for 'Today' count
  const resolvedToday =
    slaMetrics.trendSeries.length > 0
      ? slaMetrics.trendSeries[slaMetrics.trendSeries.length - 1].resolveCount
      : slaMetrics.manualResolvedCount + slaMetrics.autoResolvedCount;

  const recentIncidents = []; // Unused old variable

  // Actually, mobile dashboard wants the actual list of incidents too.
  // Let's keep the findMany for incidents but use slaMetrics for counts.
  const incidentList = await prisma.incident.findMany({
    where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      urgency: true,
      createdAt: true,
      service: { select: { name: true } },
    },
  });

  const userName = session?.user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mobile-dashboard">
      {/* Greeting */}
      <div style={{ marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
          {greeting}, {userName}!
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
          Here&apos;s your incident overview
        </p>
      </div>

      {/* On-Call Widget */}
      {currentOnCallShift && (
        <Link
          href={`/m/schedules/${currentOnCallShift.scheduleId}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.875rem 1rem',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: '12px',
            marginBottom: '1rem',
            textDecoration: 'none',
            color: 'white',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            📞
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>You&apos;re On-Call</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              {currentOnCallShift.schedule.name} • Until {formatShiftEnd(currentOnCallShift.end)}
            </div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="mobile-quick-actions">
        <Link href="/m/incidents/create" className="mobile-quick-action">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
          </svg>
          New Incident
        </Link>
        <Link href="/m/incidents" className="mobile-quick-action secondary">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Z" strokeLinecap="round" />
          </svg>
          View All
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="mobile-metrics-grid">
        <div className="mobile-metric-card">
          <div className="mobile-metric-value">{openIncidents}</div>
          <div className="mobile-metric-label">Open</div>
        </div>
        <div className="mobile-metric-card" style={{ borderLeft: '3px solid #dc2626' }}>
          <div className="mobile-metric-value" style={{ color: '#dc2626' }}>
            {criticalIncidents}
          </div>
          <div className="mobile-metric-label">Critical</div>
        </div>
        <div className="mobile-metric-card" style={{ borderLeft: '3px solid #16a34a' }}>
          <div className="mobile-metric-value" style={{ color: '#16a34a' }}>
            {resolvedToday}
          </div>
          <div className="mobile-metric-label">Resolved Today</div>
        </div>
        <div className="mobile-metric-card">
          <div className="mobile-metric-value">{openIncidents + resolvedToday}</div>
          <div className="mobile-metric-label">Total Active</div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div style={{ marginTop: '1.5rem' }}>
        <div className="mobile-section-header">
          <h2 className="mobile-section-title">Recent Incidents</h2>
          <Link href="/m/incidents" className="mobile-section-link">
            See all →
          </Link>
        </div>

        <div className="mobile-incident-list">
          {incidentList.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              <p style={{ margin: 0 }}>No open incidents 🎉</p>
            </div>
          ) : (
            incidentList.map(incident => (
              <Link
                key={incident.id}
                href={`/m/incidents/${incident.id}`}
                className="mobile-incident-card"
              >
                <div className="mobile-incident-header">
                  <span className={`mobile-incident-status ${incident.status.toLowerCase()}`}>
                    {incident.status}
                  </span>
                  {incident.urgency && (
                    <span className={`mobile-incident-urgency ${incident.urgency.toLowerCase()}`}>
                      {incident.urgency}
                    </span>
                  )}
                  {/* Duration Timer */}
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    ⏱️ {formatOpenDuration(incident.createdAt)}
                  </span>
                </div>
                <div className="mobile-incident-title">{incident.title}</div>
                <div className="mobile-incident-meta">
                  <span>{incident.service.name}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(incident.createdAt)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Desktop Version Link */}
      <Link href="/api/prefer-desktop" className="mobile-desktop-link">
        Switch to Desktop Version
      </Link>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatShiftEnd(date: Date): string {
  const endDate = new Date(date);
  const now = new Date();
  const isToday = endDate.toDateString() === now.toDateString();
  const isTomorrow = endDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

  const time = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return (
    endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ` ${time}`
  );
}

function formatOpenDuration(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0 ? `${diffHours}h ${mins}m` : `${diffHours}h`;
  }
  const hours = diffHours % 24;
  return hours > 0 ? `${diffDays}d ${hours}h` : `${diffDays}d`;
}
