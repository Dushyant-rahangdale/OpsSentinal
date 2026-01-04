'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';

const quickFilters = [
  {
    label: 'Open',
    icon: '📋',
    buildUrl: (params: URLSearchParams) => {
      if (
        params.get('status') === 'OPEN' &&
        !params.get('assignee') &&
        !params.get('service') &&
        !params.get('urgency')
      ) {
        return '/';
      }
      const newParams = new URLSearchParams();
      newParams.set('status', 'OPEN');
      return `/?${newParams.toString()}`;
    },
    isActive: (params: URLSearchParams) => {
      const status = params.get('status');
      const assignee = params.get('assignee');
      const service = params.get('service');
      const urgency = params.get('urgency');
      return status === 'OPEN' && !assignee && !service && !urgency;
    },
  },
  {
    label: 'Critical',
    icon: '🔴',
    buildUrl: (params: URLSearchParams) => {
      if (params.get('status') === 'OPEN' && params.get('urgency') === 'HIGH') {
        return '/';
      }
      const newParams = new URLSearchParams();
      newParams.set('status', 'OPEN');
      newParams.set('urgency', 'HIGH');
      return `/?${newParams.toString()}`;
    },
    isActive: (params: URLSearchParams) => {
      return params.get('status') === 'OPEN' && params.get('urgency') === 'HIGH';
    },
  },
  {
    label: 'Unassigned',
    icon: '⚠️',
    buildUrl: (params: URLSearchParams) => {
      if (params.get('status') === 'OPEN' && params.get('assignee') === '') {
        return '/';
      }
      const newParams = new URLSearchParams();
      newParams.set('status', 'OPEN');
      newParams.set('assignee', '');
      return `/?${newParams.toString()}`;
    },
    isActive: (params: URLSearchParams) => {
      return params.get('status') === 'OPEN' && params.get('assignee') === '';
    },
  },
  {
    label: 'Recent',
    icon: '🕐',
    buildUrl: (params: URLSearchParams) => {
      const newParams = new URLSearchParams(params.toString());
      newParams.set('sortBy', 'createdAt');
      newParams.set('sortOrder', 'desc');
      newParams.delete('page');
      return `/?${newParams.toString()}`;
    },
    isActive: (params: URLSearchParams) => {
      const sortBy = params.get('sortBy');
      const sortOrder = params.get('sortOrder');
      return (sortBy === 'createdAt' || !sortBy) && (sortOrder === 'desc' || !sortOrder);
    },
  },
];

export default function DashboardQuickFilters() {
  const searchParams = useSearchParams();
  const _pathname = usePathname();

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
          fontWeight: 'var(--font-weight-medium)',
          alignSelf: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        Quick Filters:
      </span>
      {quickFilters.map(filter => {
        const isActive = filter.isActive(searchParams);
        const href = filter.buildUrl(searchParams);

        return (
          <Link
            key={filter.label}
            href={href}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '999px',
              fontSize: 'var(--font-size-xs)',
              textDecoration: 'none',
              background: isActive ? 'var(--primary)' : 'var(--color-neutral-50)',
              color: isActive ? 'white' : 'var(--text-secondary)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.background = 'var(--color-neutral-100)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--color-neutral-50)';
              }
            }}
          >
            <span style={{ fontSize: '12px' }}>{filter.icon}</span>
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
