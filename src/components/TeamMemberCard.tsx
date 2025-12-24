'use client';

import { useTransition, memo } from 'react';
import Link from 'next/link';
import { useToast } from './ToastProvider';

type TeamMember = {
    id: string;
    role: string;
    user: {
        id: string;
        name: string;
        email: string;
        status?: string;
    };
};

type TeamMemberCardProps = {
    member: TeamMember;
    isSoleOwner: boolean;
    canManageMembers: boolean;
    canAssignOwnerAdmin: boolean;
    updateMemberRole: (formData: FormData) => Promise<{ error?: string } | undefined>;
    removeMember: () => Promise<{ error?: string } | undefined>;
};

function TeamMemberCard({
    member,
    isSoleOwner,
    canManageMembers,
    canAssignOwnerAdmin,
    updateMemberRole,
    removeMember
}: TeamMemberCardProps) {
    const [isPending, startTransition] = useTransition();
    const [isRemoving, startRemoving] = useTransition();
    const { showToast } = useToast();

    const roleColors = {
        OWNER: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
        ADMIN: { bg: '#fef3c7', color: '#78350f', border: '#fde68a' },
        MEMBER: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' }
    };

    const roleInfo = roleColors[member.role as keyof typeof roleColors] || roleColors.MEMBER;
    const canEditRole = canManageMembers && !isSoleOwner && (canAssignOwnerAdmin || (member.role !== 'OWNER' && member.role !== 'ADMIN'));

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRole = e.target.value;
        const formData = new FormData();
        formData.set('role', newRole);
        startTransition(async () => {
            const result = await updateMemberRole(formData);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast(`Role updated to ${newRole}`, 'success');
            }
        });
    };

    const handleRemove = () => {
        if (isSoleOwner) return;
        startRemoving(async () => {
            const result = await removeMember();
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast(`${member.user.name} removed from team`, 'success');
            }
        });
    };

    return (
        <div 
            style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem', 
                border: `1px solid ${roleInfo.border}`, 
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                transition: 'all 0.2s',
                opacity: isPending || isRemoving ? 0.6 : 1
            }}
            className="team-member-card"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                {/* User Avatar */}
                <Link 
                    href={`/users?q=${encodeURIComponent(member.user.email)}`}
                    style={{ textDecoration: 'none' }}
                >
                    <div 
                        style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            background: `linear-gradient(135deg, ${roleInfo.bg} 0%, ${roleInfo.border} 100%)`,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 'bold', 
                            fontSize: '0.9rem', 
                            color: roleInfo.color,
                            border: `2px solid ${roleInfo.border}`,
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        title={`View ${member.user.name} in users directory`}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {member.user.name.charAt(0).toUpperCase()}
                    </div>
                </Link>

                {/* User Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Link 
                            href={`/users?q=${encodeURIComponent(member.user.email)}`}
                            style={{ 
                                fontWeight: '600', 
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontSize: '0.95rem'
                            }}
                        >
                            {member.user.name}
                        </Link>
                        {member.user.status === 'DISABLED' && (
                            <span style={{ 
                                fontSize: '0.65rem', 
                                padding: '0.15rem 0.4rem', 
                                borderRadius: '999px', 
                                background: '#fee2e2', 
                                color: '#991b1b',
                                fontWeight: '600'
                            }}>
                                Disabled
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.user.email}
                    </div>
                </div>
            </div>

            {/* Role and Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Role Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {canEditRole ? (
                        <select 
                            name="role" 
                            defaultValue={member.role} 
                            onChange={handleRoleChange}
                            disabled={isPending}
                            style={{ 
                                padding: '0.4rem 0.75rem', 
                                border: `1px solid ${roleInfo.border}`, 
                                borderRadius: '8px',
                                background: roleInfo.bg,
                                color: roleInfo.color,
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                cursor: isPending ? 'wait' : 'pointer',
                                opacity: isPending ? 0.6 : 1
                            }}
                        >
                            <option value="OWNER">Owner</option>
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                        </select>
                    ) : (
                        <span 
                            style={{ 
                                padding: '0.4rem 0.75rem', 
                                borderRadius: '8px',
                                background: roleInfo.bg,
                                color: roleInfo.color,
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                border: `1px solid ${roleInfo.border}`,
                                opacity: canManageMembers ? 1 : 0.6
                            }}
                        >
                            {member.role}
                        </span>
                    )}
                    
                    {isSoleOwner && (
                        <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '500' }}>
                            ⚠️ Last owner
                        </span>
                    )}
                    {!canAssignOwnerAdmin && (member.role === 'OWNER' || member.role === 'ADMIN') && canManageMembers && (
                        <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '500' }}>
                            ⚠️ Admin required
                        </span>
                    )}
                </div>

                {/* Remove Button */}
                {canManageMembers ? (
                    <button 
                        onClick={handleRemove}
                        disabled={isSoleOwner || isRemoving}
                        title={isSoleOwner ? 'Reassign owner before removing' : 'Remove member from team'}
                        style={{ 
                            background: isSoleOwner ? '#f3f4f6' : '#fee2e2', 
                            color: isSoleOwner ? '#9ca3af' : '#dc2626', 
                            border: 'none', 
                            padding: '0.4rem 0.75rem', 
                            borderRadius: '8px', 
                            cursor: isSoleOwner || isRemoving ? 'not-allowed' : 'pointer', 
                            fontWeight: '600', 
                            fontSize: '0.75rem',
                            opacity: isSoleOwner || isRemoving ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!isSoleOwner && !isRemoving) {
                                e.currentTarget.style.background = '#fecaca';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSoleOwner && !isRemoving) {
                                e.currentTarget.style.background = '#fee2e2';
                            }
                        }}
                    >
                        {isRemoving ? 'Removing...' : 'Remove'}
                    </button>
                ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.6 }}>
                        ⚠️ No edit access
                    </span>
                )}
            </div>
        </div>
    );
}

// Memoize TeamMemberCard to prevent unnecessary re-renders in team member lists
export default memo(TeamMemberCard, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
        prevProps.member.id === nextProps.member.id &&
        prevProps.member.role === nextProps.member.role &&
        prevProps.member.user.id === nextProps.member.user.id &&
        prevProps.member.user.name === nextProps.member.user.name &&
        prevProps.member.user.email === nextProps.member.user.email &&
        prevProps.member.user.status === nextProps.member.user.status &&
        prevProps.isSoleOwner === nextProps.isSoleOwner &&
        prevProps.canManageMembers === nextProps.canManageMembers &&
        prevProps.canAssignOwnerAdmin === nextProps.canAssignOwnerAdmin
    );
});

