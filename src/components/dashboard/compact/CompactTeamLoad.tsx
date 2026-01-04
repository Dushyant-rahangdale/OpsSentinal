'use client';

import { memo, useMemo } from 'react';

/**
 * Compact Team Load Widget
 * Shows team members with active incident assignments
 */

interface AssigneeLoad {
  id: string;
  name: string | null;
  count: number;
}

interface CompactTeamLoadProps {
  assigneeLoad: AssigneeLoad[];
}

/**
 * Gets the load indicator color based on incident count
 */
function getLoadColor(count: number): string {
  if (!Number.isFinite(count) || count < 0) return 'var(--text-muted)';
  if (count >= 5) return 'var(--color-error)';
  if (count >= 3) return 'var(--color-warning)';
  return 'var(--color-success)';
}

/**
 * Safely extracts initials from a name
 */
function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Gets display name with fallback
 */
function getDisplayName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return 'Unknown';
  const trimmed = name.trim();
  return trimmed || 'Unknown';
}

/**
 * CompactTeamLoad Component
 * Displays team members and their incident load
 */
const CompactTeamLoad = memo(function CompactTeamLoad({ assigneeLoad }: CompactTeamLoadProps) {
  // Filter and validate assignees
  const activeAssignees = useMemo(() => {
    if (!Array.isArray(assigneeLoad)) return [];

    return assigneeLoad
      .filter(
        a =>
          a &&
          typeof a === 'object' &&
          a.id &&
          typeof a.count === 'number' &&
          Number.isFinite(a.count) &&
          a.count > 0
      )
      .slice(0, 5);
  }, [assigneeLoad]);

  if (activeAssignees.length === 0) {
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
        aria-label="No active assignments"
      >
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          No active assignments
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
      }}
      role="list"
      aria-label="Team incident load"
    >
      {activeAssignees.map(assignee => {
        const displayName = getDisplayName(assignee.name);
        const initials = getInitials(assignee.name);
        const loadColor = getLoadColor(assignee.count);
        const loadLabel =
          assignee.count >= 5 ? 'overloaded' : assignee.count >= 3 ? 'busy' : 'normal';

        return (
          <div
            key={assignee.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.625rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-neutral-50)',
              border: '1px solid var(--border)',
            }}
            role="listitem"
            aria-label={`${displayName}: ${assignee.count} incidents, ${loadLabel}`}
          >
            {/* Name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flex: 1,
                minWidth: 0,
              }}
            >
              {/* Avatar placeholder */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-neutral-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={displayName}
              >
                {displayName}
              </span>
            </div>
            {/* Count badge */}
            <div
              style={{
                padding: '0.125rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                background: loadColor,
                color: 'white',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                minWidth: '20px',
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
              aria-label={`${assignee.count} incidents`}
            >
              {assignee.count}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default CompactTeamLoad;
