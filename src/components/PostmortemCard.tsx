'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import UserAvatar from '@/components/UserAvatar';

type PostmortemCardProps = {
  postmortem: {
    id: string;
    incidentId: string;
    title: string;
    summary: string | null;
    status: string;
    createdAt: Date;
    publishedAt: Date | null;
    createdBy: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      gender?: string | null;
    };
    incident: {
      title: string;
    };
  };
};

function PostmortemCard({ postmortem }: PostmortemCardProps) {
  const { userTimeZone } = useTimezone();

  return (
    <Card
      variant="elevated"
      style={{
        transition: 'all 0.3s ease',
        border: '1px solid #e2e8f0',
      }}
      hover={true}
    >
      <div style={{ padding: 'var(--spacing-6)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            marginBottom: 'var(--spacing-4)',
            gap: 'var(--spacing-3)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              href={`/postmortems/${postmortem.incidentId}`}
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: '700',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                lineHeight: '1.4',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--primary-color)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              {postmortem.title}
            </Link>
            <Link
              href={`/incidents/${postmortem.incidentId}`}
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--primary-color)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
              </svg>
              {postmortem.incident.title}
            </Link>
          </div>
          <Badge
            variant={
              postmortem.status === 'PUBLISHED'
                ? 'success'
                : postmortem.status === 'ARCHIVED'
                  ? 'default'
                  : 'warning'
            }
            style={{
              flexShrink: 0,
            }}
          >
            {postmortem.status}
          </Badge>
        </div>

        {postmortem.summary && (
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--spacing-4)',
              lineHeight: '1.7',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {postmortem.summary}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--spacing-3)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            paddingTop: 'var(--spacing-4)',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {postmortem.createdBy.name}
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDateTime(postmortem.createdAt, userTimeZone, { format: 'date' })}
          </span>
          {postmortem.publishedAt && (
            <>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Published {formatDateTime(postmortem.publishedAt, userTimeZone, { format: 'date' })}
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// Memoize PostmortemCard to prevent unnecessary re-renders in postmortem lists
export default memo(PostmortemCard, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.postmortem.id === nextProps.postmortem.id &&
    prevProps.postmortem.title === nextProps.postmortem.title &&
    prevProps.postmortem.summary === nextProps.postmortem.summary &&
    prevProps.postmortem.status === nextProps.postmortem.status &&
    prevProps.postmortem.createdAt.getTime() === nextProps.postmortem.createdAt.getTime() &&
    prevProps.postmortem.publishedAt?.getTime() === nextProps.postmortem.publishedAt?.getTime() &&
    prevProps.postmortem.createdBy.name === nextProps.postmortem.createdBy.name &&
    prevProps.postmortem.incident.title === nextProps.postmortem.incident.title
  );
});
