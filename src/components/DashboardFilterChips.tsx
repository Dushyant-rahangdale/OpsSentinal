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
    params.delete('page'); // Reset to page 1
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
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
        Active Filters:
      </span>
      {activeFilters.map(filter => (
        <div
          key={filter.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            background: 'var(--surface-hover)',
            borderRadius: '999px',
            fontSize: '0.8rem',
            color: 'var(--text-primary)',
            fontWeight: '500',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
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
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: 1,
              padding: 0,
              marginLeft: '0.25rem',
              display: 'flex',
              alignItems: 'center',
            }}
            title={`Remove ${filter.label} filter`}
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={clearAll}
        style={{
          padding: '0.35rem 0.75rem',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '999px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontWeight: '500',
        }}
      >
        Clear All
      </button>
    </div>
  );
}
