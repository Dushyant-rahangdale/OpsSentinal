'use client';

import { useState, useCallback, useMemo } from 'react';
import { UserCard } from './UserCard';
import { Button } from '@/components/ui/shadcn/button';
import { Checkbox } from '@/components/ui/shadcn/checkbox';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  gender?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  createdAt?: Date;
  teamMemberships?: Array<{
    id: string;
    role: string;
    teamId: string;
    team: { name: string };
  }>;
};

type Team = {
  id: string;
  name: string;
};

type UserListProps = {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
  teams: Team[];
  updateUserRole: (userId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
  addUserToTeam: (userId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
  deactivateUser: (userId: string, formData?: FormData) => Promise<{ error?: string } | undefined>;
  reactivateUser: (userId: string, formData?: FormData) => Promise<{ error?: string } | undefined>;
  deleteUser: (userId: string, formData?: FormData) => Promise<{ error?: string } | undefined>;
  generateInvite: (userId: string, prevState: any, formData: FormData) => Promise<any>;
};

export default function UserList({
  users,
  currentUserId,
  isAdmin,
  teams,
  updateUserRole,
  addUserToTeam,
  deactivateUser,
  reactivateUser,
  deleteUser,
  generateInvite,
}: UserListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleUser = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === users.length) {
        return new Set();
      } else {
        return new Set(users.map(u => u.id));
      }
    });
  }, [users]);

  const allSelected = useMemo(
    () => users.length > 0 && selectedIds.size === users.length,
    [users.length, selectedIds.size]
  );

  return (
    <div className="space-y-4">
      {/* Select All */}
      {users.length > 0 && (
        <div className="flex items-center gap-3 px-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="Select all users"
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </span>
        </div>
      )}

      {/* User Cards */}
      <div className="space-y-2">
        {users.map(user => {
          const handleUpdateRole = async (role: string) => {
            const formData = new FormData();
            formData.append('role', role);
            await updateUserRole(user.id, formData);
          };

          const handleDeactivate = async () => {
            await deactivateUser(user.id);
          };

          const handleReactivate = async () => {
            await reactivateUser(user.id);
          };

          const handleDelete = async () => {
            await deleteUser(user.id);
          };

          const handleGenerateInvite = async () => {
            const formData = new FormData();
            await generateInvite(user.id, { error: null, token: null }, formData);
          };

          const handleAddToTeam = async (teamId: string) => {
            const formData = new FormData();
            formData.append('teamId', teamId);
            formData.append('role', 'MEMBER');
            await addUserToTeam(user.id, formData);
          };

          return (
            <UserCard
              key={user.id}
              user={user}
              selected={selectedIds.has(user.id)}
              onSelect={() => toggleUser(user.id)}
              isCurrentUser={user.id === currentUserId}
              isAdmin={isAdmin}
              teams={teams}
              onActivate={user.status === 'DISABLED' ? handleReactivate : undefined}
              onDeactivate={user.status === 'ACTIVE' ? handleDeactivate : undefined}
              onDelete={handleDelete}
              onGenerateInvite={user.status === 'INVITED' ? handleGenerateInvite : undefined}
              onUpdateRole={handleUpdateRole}
              onAddToTeam={handleAddToTeam}
            />
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No users found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
