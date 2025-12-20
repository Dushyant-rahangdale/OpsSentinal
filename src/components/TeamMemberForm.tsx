'use client';

import { useTransition } from 'react';
import { useToast } from './ToastProvider';

type User = {
    id: string;
    name: string;
    email: string;
    status?: string;
};

type TeamMemberFormProps = {
    availableUsers: User[];
    canManageMembers: boolean;
    canAssignOwnerAdmin: boolean;
    addMember: (formData: FormData) => Promise<{ error?: string } | undefined>;
    teamId: string;
};

export default function TeamMemberForm({ 
    availableUsers, 
    canManageMembers, 
    canAssignOwnerAdmin, 
    addMember,
    teamId 
}: TeamMemberFormProps) {
    const [isPending, startTransition] = useTransition();
    const { showToast } = useToast();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const userId = formData.get('userId') as string;
        const role = formData.get('role') as string;
        const userName = availableUsers.find(u => u.id === userId)?.name || 'User';
        
        startTransition(async () => {
            const result = await addMember(formData);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast(`${userName} added as ${role}`, 'success');
                e.currentTarget.reset();
            }
        });
    };

    if (!canManageMembers) {
        return (
            <div style={{ padding: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', opacity: 0.7 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    ⚠️ You don't have access to add team members. Admin or Responder role required.
                </p>
                <div style={{ display: 'grid', gap: '0.75rem', opacity: 0.5, pointerEvents: 'none' }}>
                    <select disabled style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', background: '#f3f4f6' }}>
                        <option value="">Select user</option>
                    </select>
                    <select disabled defaultValue="MEMBER" style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', background: '#f3f4f6' }}>
                        <option value="MEMBER">Member</option>
                    </select>
                    <button type="button" disabled className="glass-button primary" style={{ opacity: 0.5 }}>
                        Add to Team
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                    Select User
                </label>
                <select 
                    name="userId" 
                    required
                    disabled={isPending || availableUsers.length === 0}
                    style={{ 
                        width: '100%',
                        padding: '0.6rem', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px',
                        background: availableUsers.length === 0 ? '#f3f4f6' : 'white',
                        cursor: availableUsers.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: isPending || availableUsers.length === 0 ? 0.6 : 1
                    }}
                >
                    <option value="">{availableUsers.length === 0 ? 'All users are members' : 'Choose a user...'}</option>
                    {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name} {user.status === 'DISABLED' ? '(Disabled)' : ''} - {user.email}
                        </option>
                    ))}
                </select>
            </div>
            
            <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                    Role
                </label>
                <select 
                    name="role" 
                    defaultValue="MEMBER" 
                    disabled={!canAssignOwnerAdmin || isPending}
                    style={{ 
                        width: '100%',
                        padding: '0.6rem', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px',
                        background: !canAssignOwnerAdmin ? '#f3f4f6' : 'white',
                        opacity: !canAssignOwnerAdmin ? 0.7 : 1,
                        cursor: !canAssignOwnerAdmin ? 'not-allowed' : 'pointer'
                    }}
                    title={!canAssignOwnerAdmin ? 'Only admins can assign OWNER or ADMIN roles' : undefined}
                >
                    <option value="OWNER" disabled={!canAssignOwnerAdmin}>
                        Owner{!canAssignOwnerAdmin ? ' (Admin only)' : ''}
                    </option>
                    <option value="ADMIN" disabled={!canAssignOwnerAdmin}>
                        Admin{!canAssignOwnerAdmin ? ' (Admin only)' : ''}
                    </option>
                    <option value="MEMBER">Member</option>
                </select>
                {!canAssignOwnerAdmin && (
                    <p style={{ fontSize: '0.75rem', color: '#dc2626', fontStyle: 'italic', marginTop: '0.25rem' }}>
                        ⚠️ Only admins can assign OWNER or ADMIN roles
                    </p>
                )}
            </div>
            
            <button 
                type="submit" 
                className="glass-button primary" 
                disabled={availableUsers.length === 0 || isPending}
                style={{ 
                    opacity: availableUsers.length === 0 || isPending ? 0.6 : 1,
                    cursor: availableUsers.length === 0 || isPending ? 'not-allowed' : 'pointer'
                }}
            >
                {isPending ? 'Adding...' : 'Add to Team'}
            </button>
        </form>
    );
}

