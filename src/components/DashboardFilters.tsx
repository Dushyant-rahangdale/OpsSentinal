'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type Props = {
  initialStatus?: string;
  initialService?: string;
  initialAssignee?: string;
  services: { id: string; name: string }[];
  users: { id: string; name: string }[];
};

export default function DashboardFilters({
  initialStatus,
  initialService,
  initialAssignee,
  services,
  users,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'ALL') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when filters change
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const selectStyles = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    background: 'var(--color-neutral-50)',
    color: 'var(--text-primary)',
    fontWeight: 'var(--font-weight-medium)',
    transition: 'all 0.15s ease',
  };

  const labelStyles = {
    display: 'block',
    marginBottom: '0.375rem',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  };

  return (
    <form
      method="get"
      className="filter-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
        alignItems: 'end',
      }}
    >
      <div>
        <label style={labelStyles}>Status</label>
        <select
          name="status"
          value={initialStatus || 'ALL'}
          onChange={e => handleFilterChange('status', e.target.value)}
          style={selectStyles}
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
          <option value="SNOOZED">Snoozed</option>
          <option value="SUPPRESSED">Suppressed</option>
        </select>
      </div>

      <div>
        <label style={labelStyles}>Service</label>
        <select
          name="service"
          value={initialService || ''}
          onChange={e => handleFilterChange('service', e.target.value)}
          style={selectStyles}
        >
          <option value="">All Services</option>
          {services.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyles}>Assignee</label>
        <select
          name="assignee"
          value={initialAssignee || ''}
          onChange={e => handleFilterChange('assignee', e.target.value)}
          style={selectStyles}
        >
          <option value="">All Assignees</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <a
          href="/"
          className="glass-button"
          style={{
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            padding: '0.5rem 0.875rem',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          Clear
        </a>
      </div>
    </form>
  );
}
