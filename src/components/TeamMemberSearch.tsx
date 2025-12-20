'use client';

import { useState, useMemo } from 'react';

type User = {
    id: string;
    name: string;
    email: string;
    status?: string;
};

type TeamMemberSearchProps = {
    members: Array<{
        id: string;
        role: string;
        user: User;
    }>;
    onFilterChange: (filtered: typeof members) => void;
};

export default function TeamMemberSearch({ members, onFilterChange }: TeamMemberSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filtered = useMemo(() => {
        let result = members;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter((member) =>
                member.user.name.toLowerCase().includes(query) ||
                member.user.email.toLowerCase().includes(query)
            );
        }

        // Role filter
        if (roleFilter !== 'all') {
            result = result.filter((member) => member.role === roleFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter((member) => member.user.status === statusFilter);
        }

        return result;
    }, [members, searchQuery, roleFilter, statusFilter]);

    // Notify parent of filtered results
    useMemo(() => {
        onFilterChange(filtered);
    }, [filtered, onFilterChange]);

    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr 1fr', 
            gap: '0.75rem',
            marginBottom: '1rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
        }}>
            <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    Search Members
                </label>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: 'white'
                    }}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    Role
                </label>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: 'white',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Roles</option>
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                </select>
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    Status
                </label>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: 'white',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                    <option value="INVITED">Invited</option>
                </select>
            </div>
            {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Showing {filtered.length} of {members.length} members
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('');
                            setRoleFilter('all');
                            setStatusFilter('all');
                        }}
                        style={{
                            padding: '0.4rem 0.75rem',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
}

