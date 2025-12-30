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
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              textDecoration: 'none',
              background: isActive ? 'var(--primary)' : 'rgba(211, 47, 47, 0.1)',
              color: isActive ? 'white' : 'var(--primary)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
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
