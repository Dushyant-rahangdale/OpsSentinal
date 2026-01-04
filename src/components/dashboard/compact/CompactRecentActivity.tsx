'use client';

import { memo, useMemo } from 'react';

/**
 * Compact Recent Activity Widget
 * Shows last 5 incident events with relative timestamps
 */

interface RecentIncident {
  id: string;
  title: string;
  status: string;
  urgency: string;
  createdAt: Date | string;
  service?: { name: string } | null;
}

interface CompactRecentActivityProps {
  incidents: RecentIncident[];
}

/**
 * Safely parses a date value
 */
function safeParseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;

  try {
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Calculates relative time string from a date
 */
function getRelativeTime(date: Date | string | null | undefined): string {
  const parsedDate = safeParseDate(date);

  if (!parsedDate) {
    return 'Unknown';
  }

  const now = Date.now();
  const then = parsedDate.getTime();
  const diffMs = now - then;

  // Handle future dates
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older dates, show short date
  return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'var(--color-danger)';
    case 'ACKNOWLEDGED':
      return 'var(--color-warning)';
    case 'RESOLVED':
      return 'var(--color-success)';
    default:
      return 'var(--text-muted)';
  }
}

/**
 * CompactRecentActivity Component
 * Displays recent incident activity with status indicators
 */
const CompactRecentActivity = memo(function CompactRecentActivity({
  incidents,
}: CompactRecentActivityProps) {
  // Ensure incidents is always an array and filter out invalid entries
  const validIncidents = useMemo(() => {
    if (!Array.isArray(incidents)) return [];
    return incidents.filter(inc => inc && typeof inc === 'object' && inc.id && inc.title);
  }, [incidents]);

  if (validIncidents.length === 0) {
    return (
      <div
        style={{
          padding: '0.875rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-neutral-50)',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}
        role="status"
        aria-label="No recent activity"
      >
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          No recent activity
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
      role="list"
      aria-label="Recent activity"
    >
      {validIncidents.slice(0, 5).map(incident => {
        const serviceName = incident.service?.name || 'Unknown';
        const relativeTime = getRelativeTime(incident.createdAt);
        const statusColor = getStatusColor(incident.status);

        return (
          <div
            key={incident.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-neutral-50)',
              border: '1px solid var(--border)',
            }}
            role="listitem"
            aria-label={`${incident.title} - ${serviceName} - ${relativeTime}`}
          >
            {/* Status indicator */}
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: statusColor,
                marginTop: '4px',
                flexShrink: 0,
              }}
              aria-hidden="true"
              title={incident.status}
            />
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={incident.title}
              >
                {incident.title}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '2px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={serviceName}
                >
                  {serviceName}
                </span>
                <span aria-hidden="true">•</span>
                <span>{relativeTime}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default CompactRecentActivity;
