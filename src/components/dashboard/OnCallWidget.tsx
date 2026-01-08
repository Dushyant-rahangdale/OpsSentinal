'use client';

import Link from 'next/link';
import { memo, useCallback } from 'react';

interface OnCallShift {
  id: string;
  user: {
    name: string | null;
  };
  schedule: {
    name: string;
  };
}

interface OnCallWidgetProps {
  activeShifts: OnCallShift[];
}

/**
 * Extract initials from a name safely
 */
function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Get display name safely
 */
function getDisplayName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return 'Unknown User';
  const trimmed = name.trim();
  return trimmed || 'Unknown User';
}

/**
 * OnCallWidget - Shows currently active on-call shifts
 * Displays up to 3 active shifts with user avatars and schedule info
 */
const OnCallWidget = memo(function OnCallWidget({ activeShifts }: OnCallWidgetProps) {
  // Ensure activeShifts is always an array
  const shifts = Array.isArray(activeShifts) ? activeShifts : [];

  const handleCardHover = useCallback((e: React.MouseEvent<HTMLDivElement>, isEnter: boolean) => {
    if (isEnter) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
    } else {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }
  }, []);

  return (
    <div
      className="glass-panel"
      style={{ background: 'white', padding: '1.5rem' }}
      role="region"
      aria-label="Who is on-call"
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
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background:
              'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            margin: 0,
            color: 'var(--text-primary)',
          }}
        >
          Who is On-Call
        </h3>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Link
          href="/schedules"
          className="dashboard-link-hover"
          style={{
            fontSize: '0.85rem',
            color: 'var(--primary-color)',
            textDecoration: 'none',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          aria-label="View all schedules"
        >
          View All <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        role="list"
        aria-label="Active on-call shifts"
      >
        {shifts.length === 0 ? (
          <div
            style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}
            role="listitem"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ opacity: 0.3, margin: '0 auto 0.5rem', display: 'block' }}
              aria-hidden="true"
            >
              <circle cx="9" cy="7" r="4" />
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <line x1="17" y1="8" x2="23" y2="8" />
            </svg>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>No active on-call shifts</p>
          </div>
        ) : (
          shifts.slice(0, 3).map(shift => {
            const userName = getDisplayName(shift.user?.name);
            const initials = getInitials(shift.user?.name);
            const scheduleName = shift.schedule?.name || 'Unknown Schedule';

            return (
              <Link
                key={shift.id}
                href={`/schedules`}
                className="dashboard-oncall-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                role="listitem"
                aria-label={`${userName} on ${scheduleName}`}
                onMouseEnter={e =>
                  handleCardHover(e as unknown as React.MouseEvent<HTMLDivElement>, true)
                }
                onMouseLeave={e =>
                  handleCardHover(e as unknown as React.MouseEvent<HTMLDivElement>, false)
                }
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(51, 65, 85, 0.1)',
                    color: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(51, 65, 85, 0.2)',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '0.2rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {userName}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ opacity: 0.5, flexShrink: 0 }}
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 2v4M8 2v4M3 10h18"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {scheduleName}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
});

export default OnCallWidget;
