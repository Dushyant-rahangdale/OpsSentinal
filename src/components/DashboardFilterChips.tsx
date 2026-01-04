'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type FilterChipsProps = {
  services: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
};

export default function DashboardFilterChips({ services, users }: FilterChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilters: Array<{ key: string; label: string; value: string }> = [];

  const status = searchParams.get('status');
  if (status && status !== 'ALL') {
    activeFilters.push({ key: 'status', label: 'Status', value: status });
  }

  const serviceId = searchParams.get('service');
  if (serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      activeFilters.push({ key: 'service', label: 'Service', value: service.name });
    }
  }

  const assigneeId = searchParams.get('assignee');
  if (assigneeId !== null) {
    if (assigneeId === '') {
      activeFilters.push({ key: 'assignee', label: 'Assignee', value: 'Unassigned' });
    } else {
      const user = users.find(u => u.id === assigneeId);
      if (user) {
        activeFilters.push({ key: 'assignee', label: 'Assignee', value: user.name });
      }
    }
  }

  const urgency = searchParams.get('urgency');
  if (urgency) {
    activeFilters.push({ key: 'urgency', label: 'Urgency', value: urgency });
  }

  const range = searchParams.get('range');
  if (range && range !== 'all') {
    activeFilters.push({ key: 'range', label: 'Time Range', value: `Last ${range} days` });
  }

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => {
    router.push(pathname);
  };

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: '0.5rem',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
          fontWeight: 'var(--font-weight-medium)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        Active Filters:
      </span>
      {activeFilters.map(filter => (
        <div
          key={filter.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.3rem 0.625rem',
            background: 'var(--color-neutral-100)',
            borderRadius: '999px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-primary)',
            fontWeight: 'var(--font-weight-medium)',
            border: '1px solid var(--border)',
          }}
        >
          <span>
            {filter.label}: <strong>{filter.value}</strong>
          </span>
          <button
            onClick={() => removeFilter(filter.key)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              lineHeight: 1,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s ease',
            }}
            title={`Remove ${filter.label} filter`}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={clearAll}
        style={{
          padding: '0.3rem 0.625rem',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '999px',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontWeight: 'var(--font-weight-medium)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--color-neutral-100)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        Clear All
      </button>
    </div>
  );
}
