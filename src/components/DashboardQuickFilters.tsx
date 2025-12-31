'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';

const quickFilters = [
  {
    label: 'Open',
    icon: '📋',
    buildUrl: (params: URLSearchParams) => {
      // If already showing Open, clear the filter
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
      // If already showing Critical, clear the filter
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
      // If already showing Unassigned, clear the filter
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
      // Remove page to reset to first page
      newParams.delete('page');
      return `/?${newParams.toString()}`;
    },
    isActive: (params: URLSearchParams) => {
      const sortBy = params.get('sortBy');
      const sortOrder = params.get('sortOrder');
      // Active if sorting by createdAt desc (default) and no other specific filters
      return (sortBy === 'createdAt' || !sortBy) && (sortOrder === 'desc' || !sortOrder);
    },
  },
];

export default function DashboardQuickFilters() {
  const searchParams = useSearchParams();
  const _pathname = usePathname();

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <span
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          fontWeight: '600',
          alignSelf: 'center',
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
              padding: '0.4rem 0.9rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              textDecoration: 'none',
              background: isActive ? 'var(--surface-active)' : 'var(--surface-card)',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
              boxShadow: isActive ? '0 0 0 1px var(--primary-alpha-20)' : 'var(--shadow-sm)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isActive ? 'translateY(0)' : 'translateY(0)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.background = 'var(--surface-hover)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--surface-card)';
              }
            }}
          >
            <span>{filter.icon}</span>
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
