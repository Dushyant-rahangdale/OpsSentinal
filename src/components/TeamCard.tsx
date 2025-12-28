'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmDialog from './ConfirmDialog';
import TeamMemberCard from './TeamMemberCard';
import TeamMemberSearch from './TeamMemberSearch';
import TeamActivityLog from './TeamActivityLog';
import BulkTeamMemberActions from './BulkTeamMemberActions';
import TeamStats from './TeamStats';
import TeamMemberForm from './TeamMemberForm';
import { useToast } from './ToastProvider';

type TeamCardProps = {
    team: any;
    teamId: string;
    ownerCount: number;
    adminCount: number;
    memberCount: number;
    availableUsers: any[];
    activityLogs: any[];
    activityTotal: number;
    canUpdateTeam: boolean;
    canDeleteTeam: boolean;
    canManageMembers: boolean;
    canManageNotifications: boolean;
    canAssignOwnerAdmin: boolean;
    updateTeam: (teamId: string, formData: FormData) => Promise<any>;
    deleteTeam: (teamId: string) => Promise<{ error?: string } | undefined>;
    addTeamMember: (teamId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
    updateTeamMemberRole: (memberId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
    updateTeamMemberNotifications: (memberId: string, receiveNotifications: boolean) => Promise<{ error?: string } | undefined>;
    removeTeamMember: (memberId: string) => Promise<{ error?: string } | undefined>;
};

export default function TeamCard({
    team,
    teamId,
    ownerCount,
    adminCount,
    memberCount,
    availableUsers,
    activityLogs,
    activityTotal,
    canUpdateTeam,
    canDeleteTeam,
    canManageMembers,
    canManageNotifications,
    canAssignOwnerAdmin,
    updateTeam,
    deleteTeam,
    addTeamMember,
    updateTeamMemberRole,
    updateTeamMemberNotifications,
    removeTeamMember
}: TeamCardProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [filteredMembers, setFilteredMembers] = useState(team.members);
    const [activityPage, setActivityPage] = useState(1);

    // Create bound functions for this team
    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        const result = await deleteTeam(teamId);
        if (result?.error) {
            showToast(result.error, 'error');
        } else {
            showToast('Team deleted successfully', 'success');
            router.refresh();
        }
    };

    const handleUpdateTeam = async (formData: FormData) => {
        const result = await updateTeam(teamId, formData);
        if (result?.error) {
            showToast(result.error, 'error');
        } else {
            showToast('Team updated successfully', 'success');
            router.refresh();
        }
    };

    const handleAddMember = async (formData: FormData) => {
        return await addTeamMember(teamId, formData);
    };

    const activityTotalPages = Math.ceil(activityTotal / 5);

    return (
        <>
            <div
                className="glass-panel"
                style={{
                    padding: '2rem',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                }}
            >
                {/* Team Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    paddingBottom: '1.5rem',
                    borderBottom: '2px solid #e2e8f0'
                }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            marginBottom: '0.5rem',
                            color: 'var(--text-primary)'
                        }}>
                            {team.name}
                        </h3>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.95rem',
                            lineHeight: 1.6,
                            marginBottom: '1rem'
                        }}>
                            {team.description || 'No description provided.'}
                        </p>
                        <TeamStats
                            memberCount={memberCount}
                            serviceCount={team._count.services}
                            ownerCount={ownerCount}
                            adminCount={adminCount}
                        />
                    </div>
                    {canDeleteTeam ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="delete-team-button"
                            style={{
                                background: 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                padding: '0.6rem 1.25rem',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Delete Team
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            style={{
                                background: '#f3f4f6',
                                color: '#9ca3af',
                                border: 'none',
                                padding: '0.6rem 1.25rem',
                                borderRadius: '10px',
                                cursor: 'not-allowed',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                opacity: 0.6
                            }}
                            title="Admin access required to delete teams"
                        >
                            Delete Team
                        </button>
                    )}
                </div>

                {/* Update Team Form */}
                <div style={{ marginBottom: '2rem' }}>
                    {canUpdateTeam ? (
                        <form
                            key={`team-form-${team.id}-${team.teamLeadId || 'none'}-${team.updatedAt || Date.now()}`}
                            action={handleUpdateTeam}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr auto',
                                gap: '1rem',
                                alignItems: 'end',
                                padding: '1rem',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0'
                            }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>Team Name</label>
                                <input
                                    name="name"
                                    defaultValue={team.name}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        background: 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>Description</label>
                                <input
                                    name="description"
                                    defaultValue={team.description || ''}
                                    placeholder="Team mission"
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        background: 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    Team Lead
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '0.25rem' }}>
                                        (Optional)
                                    </span>
                                </label>
                                <select
                                    name="teamLeadId"
                                    defaultValue={team.teamLeadId || ''}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        background: 'white',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">No team lead</option>
                                    {team.members.map((member: any) => (
                                        <option key={member.userId} value={member.userId}>
                                            {member.user.name} {member.role === 'OWNER' ? '(Owner)' : member.role === 'ADMIN' ? '(Admin)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Team lead can be notified separately in escalation policies
                                </p>
                            </div>
                            <button type="submit" className="glass-button" style={{ height: 'fit-content' }}>
                                Update
                            </button>
                        </form>
                    ) : (
                        <div style={{
                            padding: '1rem',
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            opacity: 0.7
                        }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                ⚠️ You don't have access to edit this team. Admin or Responder role required.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end', opacity: 0.5, pointerEvents: 'none' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Team Name</label>
                                    <input name="name" defaultValue={team.name} disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', background: '#f3f4f6' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Description</label>
                                    <input name="description" defaultValue={team.description || ''} disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', background: '#f3f4f6' }} />
                                </div>
                                <button type="button" disabled className="glass-button" style={{ opacity: 0.5 }}>Update</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    {/* Members Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Members ({filteredMembers.length})</h4>
                            <Link
                                href={`/users?teamId=${team.id}`}
                                style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--primary)',
                                    textDecoration: 'none',
                                    fontWeight: '500'
                                }}
                            >
                                View in Users →
                            </Link>
                        </div>
                        {team.members.length === 0 ? (
                            <div style={{
                                padding: '2rem',
                                textAlign: 'center',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px dashed #e2e8f0'
                            }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No members assigned.</p>
                            </div>
                        ) : (
                            <>
                                <TeamMemberSearch
                                    members={team.members}
                                    onFilterChange={setFilteredMembers}
                                />
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {filteredMembers.map((member: any) => {
                                        const handleUpdateRole = async (formData: FormData) => {
                                            return await updateTeamMemberRole(member.id, formData);
                                        };
                                        const handleUpdateNotifications = async (receiveNotifications: boolean) => {
                                            return await updateTeamMemberNotifications(member.id, receiveNotifications);
                                        };
                                        const handleRemove = async () => {
                                            return await removeTeamMember(member.id);
                                        };
                                        const isSoleOwner = member.role === 'OWNER' && ownerCount === 1;

                                        return (
                                            <TeamMemberCard
                                                key={member.id}
                                                member={member}
                                                isSoleOwner={isSoleOwner}
                                                canManageMembers={canManageMembers}
                                                canManageNotifications={canManageNotifications}
                                                canAssignOwnerAdmin={canAssignOwnerAdmin}
                                                updateMemberRole={handleUpdateRole}
                                                updateMemberNotifications={handleUpdateNotifications}
                                                removeMember={handleRemove}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>Add Member</h4>
                        <TeamMemberForm
                            availableUsers={availableUsers}
                            canManageMembers={canManageMembers}
                            canAssignOwnerAdmin={canAssignOwnerAdmin}
                            addMember={handleAddMember}
                            teamId={team.id}
                        />

                        {availableUsers.length > 1 && (
                            <BulkTeamMemberActions
                                availableUsers={availableUsers}
                                canManageMembers={canManageMembers}
                                canAssignOwnerAdmin={canAssignOwnerAdmin}
                                addMember={handleAddMember}
                                teamId={team.id}
                            />
                        )}

                        <div style={{ marginTop: '2rem' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Owned Services ({team.services.length})</h4>
                            {team.services.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No services assigned.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {team.services.map((service: any) => (
                                        <Link
                                            key={service.id}
                                            href={`/services/${service.id}`}
                                            className="service-link"
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                                                color: 'var(--primary)',
                                                textDecoration: 'none',
                                                fontWeight: '500',
                                                fontSize: '0.9rem',
                                                border: '1px solid #fecaca',
                                                transition: 'all 0.2s',
                                                display: 'inline-block'
                                            }}
                                        >
                                            {service.name} →
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Team Activity Log */}
                {activityLogs.length > 0 && (
                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e2e8f0' }}>
                        <TeamActivityLog
                            teamId={team.id}
                            logs={activityLogs}
                            totalLogs={activityTotal}
                            currentPage={activityPage}
                            totalPages={activityTotalPages}
                            onPageChange={(page) => {
                                setActivityPage(page);
                                // Could implement URL-based pagination here
                            }}
                        />
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Team"
                message={`Are you sure you want to delete "${team.name}"? This will remove all team members and unassign all services. This action cannot be undone.`}
                confirmText="Delete Team"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
}

