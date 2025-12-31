'use client';

import Link from 'next/link';

interface OnCallShift {
  id: string;
  user: {
    name: string;
  };
  schedule: {
    name: string;
  };
}

interface OnCallWidgetProps {
  activeShifts: OnCallShift[];
}

export default function OnCallWidget({ activeShifts }: OnCallWidgetProps) {
  return (
    <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
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
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          >
            <path
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
            color: 'var(--primary)',
            textDecoration: 'none',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          View All <span>→</span>
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activeShifts.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ opacity: 0.3, margin: '0 auto 0.5rem' }}
            >
              <path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z" />
            </svg>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>No active on-call shifts</p>
          </div>
        ) : (
          activeShifts.slice(0, 3).map(shift => (
            <div
              key={shift.id}
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
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(51, 65, 85, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(51, 65, 85, 0.2)',
                }}
              >
                {shift.user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '0.2rem',
                  }}
                >
                  {shift.user.name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ opacity: 0.5 }}
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
                    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {shift.schedule.name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
