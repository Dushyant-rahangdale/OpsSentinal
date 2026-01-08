'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reassignIncident } from '@/app/(app)/incidents/actions';
import { useToast } from '../ToastProvider';
import { getDefaultAvatar } from '@/lib/avatar';

type AssigneeSectionProps = {
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    gender?: string | null;
  } | null;
  team: { id: string; name: string } | null;
  assigneeId: string | null;
  teamId: string | null;
  users: Array<{ id: string; name: string; email: string }>;
  teams: Array<{ id: string; name: string }>;
  incidentId: string;
  canManage: boolean;
  variant?: 'list' | 'detail' | 'header';
};

export default function AssigneeSection({
  assignee,
  team,
  assigneeId,
  teamId,
  users,
  teams = [],
  incidentId,
  canManage,
  variant = 'list',
}: AssigneeSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isReassigning, setIsReassigning] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleReassign = async (value: string) => {
    startTransition(async () => {
      try {
        // Parse value: "user:id" or "team:id" or empty for unassign
        let newAssigneeId = '';
        let newTeamId = '';

        if (value.startsWith('user:')) {
          newAssigneeId = value.substring(5);
        } else if (value.startsWith('team:')) {
          newTeamId = value.substring(5);
        }

        await reassignIncident(incidentId, newAssigneeId, newTeamId);
        showToast(
          value ? 'Incident reassigned successfully' : 'Incident unassigned successfully',
          'success'
        );
        setIsReassigning(false);
        router.refresh();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to reassign', 'error');
      }
    });
  };

  if (variant === 'header') {
    return (
      <div>
        {!isReassigning ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
                flex: 1,
              }}
            >
              {team ? `👥 ${team.name}` : assignee ? assignee.name : 'Unassigned'}
            </div>
            {canManage && (
              <button
                onClick={() => setIsReassigning(true)}
                style={{
                  padding: '0.35rem 0.65rem',
                  background: 'rgba(15, 23, 42, 0.06)',
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  borderRadius: '0px',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.12)';
                }}
              >
                Change
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <select
              defaultValue={teamId ? `team:${teamId}` : assigneeId ? `user:${assigneeId}` : ''}
              onChange={e => {
                handleReassign(e.target.value);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border)',
                borderRadius: '0px',
                background: 'white',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
              }}
              disabled={isPending}
            >
              <option value="">Unassigned</option>
              <optgroup label="👤 Users">
                {users.map(user => (
                  <option key={user.id} value={`user:${user.id}`}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </optgroup>
              <optgroup label="👥 Teams">
                {teams.map(team => (
                  <option key={team.id} value={`team:${team.id}`}>
                    {team.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <button
              onClick={() => setIsReassigning(false)}
              disabled={isPending}
              style={{
                padding: '0.35rem 0.65rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0px',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
          }}
        >
          Assignee
        </label>
        {isReassigning ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              defaultValue={assigneeId || ''}
              onChange={e => {
                const newValue = e.target.value;
                if (newValue !== (assigneeId || '')) {
                  handleReassign(newValue || '');
                } else {
                  // Same value selected, just close
                  setTimeout(() => setIsReassigning(false), 100);
                }
              }}
              autoFocus
              style={{
                flex: 1,
                padding: '0.625rem 0.875rem',
                border: '1px solid var(--primary-color)',
                borderRadius: '0px',
                background: '#fff',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">Unassigned</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsReassigning(false)}
              style={{
                padding: '0.625rem 0.875rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1rem',
              background: assignee
                ? 'linear-gradient(180deg, #feecec 0%, #fbdcdc 100%)'
                : '#f9fafb',
              border: `1px solid ${assignee ? 'rgba(211,47,47,0.2)' : 'var(--border)'}`,
              borderRadius: '0px',
              transition: 'all 0.15s',
              cursor: canManage ? 'pointer' : 'default',
            }}
            onClick={() => canManage && setIsReassigning(true)}
            onMouseEnter={e => {
              if (canManage) {
                e.currentTarget.style.borderColor = 'var(--primary-color)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(211, 47, 47, 0.1)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = assignee
                ? 'rgba(211,47,47,0.2)'
                : 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {assignee ? (
                <>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      boxShadow: '0 2px 4px rgba(211, 47, 47, 0.2)',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={assignee.avatarUrl || getDefaultAvatar(assignee.gender, assignee.name)}
                      alt={assignee.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div>
                    <div
                      style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}
                    >
                      {assignee.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.15rem',
                      }}
                    >
                      {assignee.email}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#e5e7eb',
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                    }}
                  >
                    ?
                  </div>
                  <div
                    style={{
                      fontWeight: 500,
                      color: 'var(--text-muted)',
                      fontSize: '0.95rem',
                      fontStyle: 'italic',
                    }}
                  >
                    Unassigned
                  </div>
                </>
              )}
            </div>
            {canManage && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsReassigning(true);
                }}
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '0px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(211, 47, 47, 0.1)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.color = 'var(--primary-color)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
                title="Reassign incident"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // List variant
  if (isReassigning) {
    return (
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}
      >
        <select
          defaultValue={assigneeId || ''}
          onChange={e => {
            if (e.target.value) {
              handleReassign(e.target.value);
            }
          }}
          autoFocus
          style={{
            padding: '0.5rem',
            border: '1px solid var(--primary-color)',
            borderRadius: '0px',
            fontSize: '0.85rem',
            background: '#fff',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">Unassigned</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setIsReassigning(false)}
          style={{
            padding: '0.4rem 0.75rem',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {assignee ? (
        <>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <img
              src={assignee.avatarUrl || getDefaultAvatar(assignee.gender, assignee.name)}
              alt={assignee.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            {assignee.name.split(' ')[0]}
          </span>
        </>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          Unassigned
        </span>
      )}
      {canManage && (
        <button
          onClick={e => {
            e.stopPropagation();
            setIsReassigning(true);
          }}
          style={{
            padding: '0.4rem',
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            transition: 'all 0.15s',
            flexShrink: 0,
            width: '28px',
            height: '28px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#feecec';
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.color = 'var(--primary-color)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
          title="Reassign"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      )}
    </div>
  );
}
