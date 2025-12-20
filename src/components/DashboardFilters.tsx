'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type Props = {
    initialStatus?: string;
    initialService?: string;
    initialAssignee?: string;
    services: { id: string; name: string }[];
    users: { id: string; name: string }[];
};

export default function DashboardFilters({ initialStatus, initialService, initialAssignee, services, users }: Props) {
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
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <select
                value={initialStatus || 'ALL'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', minWidth: '150px' }}
            >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
            </select>

            <select
                value={initialService || ''}
                onChange={(e) => handleFilterChange('service', e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', minWidth: '150px' }}
            >
                <option value="">All Services</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select
                value={initialAssignee || ''}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', minWidth: '150px' }}
            >
                <option value="">All Assignees</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
        </div>
    );
}
