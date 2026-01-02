import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MobileIncidentActions from './actions';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MobileIncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id || null;

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      service: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      },
      watchers: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } } },
      },
      postmortem: { select: { id: true, status: true } },
    },
  });

  if (!incident) {
    notFound();
  }

  // Fetch users and teams for reassignment
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="mobile-dashboard">
      {/* Back Button */}
      <Link
        href="/m/incidents"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          color: 'var(--primary)',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: '600',
          marginBottom: '1rem',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Incidents
      </Link>

      {/* Status & Urgency */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span className={`mobile-incident-status ${incident.status.toLowerCase()}`}>
          {incident.status}
        </span>
        {incident.urgency && (
          <span className={`mobile-incident-urgency ${incident.urgency.toLowerCase()}`}>
            {incident.urgency}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
        {incident.title}
      </h1>

      {/* Meta Info */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: '1.5rem',
        }}
      >
        <span>{incident.service.name}</span>
        <span>•</span>
        <span>{formatDate(incident.createdAt)}</span>
      </div>

      {/* Action Buttons */}
      <MobileIncidentActions
        incidentId={incident.id}
        status={incident.status}
        urgency={incident.urgency}
        assigneeId={incident.assigneeId}
        currentUserId={currentUserId}
        users={users}
        teams={teams}
      />

      {/* Details Card */}
      <div className="mobile-metric-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 0.75rem' }}>Details</h3>

        <DetailRow label="Service" value={incident.service.name} />
        <DetailRow
          label="Assigned To"
          value={incident.assignee?.name || incident.team?.name || 'Unassigned'}
          subValue={incident.team ? '(Team)' : undefined}
        />
        <DetailRow label="Created" value={formatDate(incident.createdAt)} />
        {incident.acknowledgedAt && (
          <DetailRow label="Acknowledged" value={formatDate(incident.acknowledgedAt)} />
        )}
        {incident.resolvedAt && (
          <DetailRow label="Resolved" value={formatDate(incident.resolvedAt)} />
        )}
      </div>

      {/* Description */}
      {incident.description && (
        <div className="mobile-metric-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 0.5rem' }}>
            Description
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {incident.description}
          </p>
        </div>
      )}

      {/* Timeline / Events */}
      <div className="mobile-metric-card">
        <h3 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 0.75rem' }}>
          Recent Activity
        </h3>

        {incident.events.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            No activity yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {incident.events.map(event => (
              <div
                key={event.id}
                style={{
                  paddingLeft: '1rem',
                  borderLeft: '2px solid var(--border)',
                }}
              >
                <div
                  style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}
                >
                  {event.message}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatTimeAgo(event.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      {incident.tags.length > 0 && (
        <div className="mobile-metric-card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 0.5rem' }}>Tags</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {incident.tags.map(({ tag }) => (
              <span
                key={tag.id}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  background: tag.color || '#e5e7eb',
                  color: tag.color ? 'white' : '#374151',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Watchers */}
      {incident.watchers.length > 0 && (
        <div className="mobile-metric-card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 0.5rem' }}>
            Watchers ({incident.watchers.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {incident.watchers.map(w => (
              <span
                key={w.id}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--badge-neutral-bg)',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                }}
              >
                {w.user.name || w.user.email}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {incident.notes.length > 0 && (
        <div className="mobile-metric-card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 0.75rem' }}>
            Notes ({incident.notes.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {incident.notes.map(n => (
              <div
                key={n.id}
                style={{
                  paddingLeft: '1rem',
                  borderLeft: '2px solid #6366f1',
                }}
              >
                <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{n.content}</div>
                <div
                  style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}
                >
                  {n.user.name || n.user.email} • {formatTimeAgo(n.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Postmortem Link */}
      {incident.status === 'RESOLVED' && incident.postmortem && (
        <div style={{ marginTop: '1rem' }}>
          <Link
            href={`/m/postmortems/${incident.postmortem.id}`}
            style={{
              display: 'block',
              padding: '1rem',
              background: 'var(--badge-success-bg)',
              border: '1px solid var(--badge-success-text)',
              borderRadius: '8px',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            <span style={{ fontWeight: '600', color: 'var(--badge-success-text)' }}>
              📝 View Postmortem ({incident.postmortem.status})
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.5rem 0',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.85rem',
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontWeight: '500', display: 'block' }}>{value}</span>
        {subValue && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subValue}</span>
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
