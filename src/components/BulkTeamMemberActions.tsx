'use client';

import { useState, useTransition } from 'react';
import { useToast } from './ToastProvider';

type User = {
    id: string;
    name: string;
    email: string;
    status?: string;
};

type BulkTeamMemberActionsProps = {
    availableUsers: User[];
    canManageMembers: boolean;
    canAssignOwnerAdmin: boolean;
    addMember: (formData: FormData) => Promise<{ error?: string } | undefined>;
    teamId: string;
};

export default function BulkTeamMemberActions({
    availableUsers,
    canManageMembers,
    canAssignOwnerAdmin,
    addMember,
    teamId
}: BulkTeamMemberActionsProps) {
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [role, setRole] = useState<string>('MEMBER');
    const [isPending, startTransition] = useTransition();
    const { showToast } = useToast();

    if (!canManageMembers) {
        return null;
    }

    const handleToggleUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedUsers.size === availableUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(availableUsers.map(u => u.id)));
        }
    };

    const handleBulkAdd = () => {
        if (selectedUsers.size === 0) {
            showToast('Select at least one user', 'error');
            return;
        }

        if (!canAssignOwnerAdmin && (role === 'OWNER' || role === 'ADMIN')) {
            showToast('Only admins can assign OWNER or ADMIN roles', 'error');
            return;
        }

        startTransition(async () => {
            let successCount = 0;
            let errorCount = 0;

            for (const userId of selectedUsers) {
                const formData = new FormData();
                formData.set('userId', userId);
                formData.set('role', role);
                const result = await addMember(formData);
                if (result?.error) {
                    errorCount++;
                } else {
                    successCount++;
                }
            }

            if (successCount > 0) {
                showToast(`Successfully added ${successCount} member${successCount > 1 ? 's' : ''}`, 'success');
            }
            if (errorCount > 0) {
                showToast(`Failed to add ${errorCount} member${errorCount > 1 ? 's' : ''}`, 'error');
            }

            setSelectedUsers(new Set());
        });
    };

    if (availableUsers.length === 0) {
        return null;
    }

    return (
        <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h5 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Bulk Add Members
                </h5>
                {availableUsers.length > 0 && (
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        style={{
                            padding: '0.3rem 0.6rem',
                            background: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        {selectedUsers.size === availableUsers.length ? 'Deselect All' : 'Select All'}
                    </button>
                )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                    Role for Selected Users
                </label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={!canAssignOwnerAdmin && (role === 'OWNER' || role === 'ADMIN')}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: (!canAssignOwnerAdmin && (role === 'OWNER' || role === 'ADMIN')) ? '#f3f4f6' : 'white',
                        opacity: (!canAssignOwnerAdmin && (role === 'OWNER' || role === 'ADMIN')) ? 0.7 : 1
                    }}
                >
                    <option value="OWNER" disabled={!canAssignOwnerAdmin}>Owner{!canAssignOwnerAdmin ? ' (Admin only)' : ''}</option>
                    <option value="ADMIN" disabled={!canAssignOwnerAdmin}>Admin{!canAssignOwnerAdmin ? ' (Admin only)' : ''}</option>
                    <option value="MEMBER">Member</option>
                </select>
            </div>

            <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: 'white',
                marginBottom: '1rem'
            }}>
                {availableUsers.map((user) => (
                    <label
                        key={user.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.6rem 0.75rem',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                        <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleToggleUser(user.id)}
                            style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{user.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                        {user.status === 'DISABLED' && (
                            <span style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '4px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                fontWeight: '600'
                            }}>
                                Disabled
                            </span>
                        )}
                    </label>
                ))}
            </div>

            <button
                type="button"
                onClick={handleBulkAdd}
                disabled={selectedUsers.size === 0 || isPending}
                className="glass-button primary"
                style={{
                    width: '100%',
                    opacity: selectedUsers.size === 0 || isPending ? 0.6 : 1,
                    cursor: selectedUsers.size === 0 || isPending ? 'not-allowed' : 'pointer'
                }}
            >
                {isPending ? 'Adding...' : `Add ${selectedUsers.size} Member${selectedUsers.size !== 1 ? 's' : ''}`}
            </button>
        </div>
    );
}

