'use client';

import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog';
import {
  Mail,
  Building2,
  Briefcase,
  Key,
  AlertTriangle,
  Trash2,
  UserX,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import GenerateResetLinkButton from '@/components/GenerateResetLinkButton';

type Team = {
  id: string;
  name: string;
};

type UserCardProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatarUrl?: string | null;
    gender?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    teamMemberships?: Array<{
      id: string;
      role: string;
      teamId: string;
      team: { name: string };
    }>;
  };
  selected: boolean;
  onSelect: () => void;
  isCurrentUser: boolean;
  isAdmin: boolean;
  teams: Team[];
  onActivate?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
  onGenerateInvite?: () => void;
  onUpdateRole?: (role: string) => void;
  onAddToTeam?: (teamId: string) => void;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getDefaultAvatar = (gender: string | null | undefined, userId: string): string => {
  const genderLower = gender?.toLowerCase();
  switch (genderLower) {
    case 'male':
      return `/api/avatar?style=big-smile&seed=${userId}-male&backgroundColor=b91c1c&radius=50`;
    case 'female':
      return `/api/avatar?style=big-smile&seed=${userId}-female&backgroundColor=65a30d&radius=50`;
    case 'non-binary':
      return `/api/avatar?style=big-smile&seed=${userId}-nb&backgroundColor=7c3aed&radius=50`;
    case 'other':
      return `/api/avatar?style=big-smile&seed=${userId}-other&backgroundColor=0891b2&radius=50`;
    case 'prefer-not-to-say':
      return `/api/avatar?style=big-smile&seed=${userId}-neutral&backgroundColor=6366f1&radius=50`;
    default:
      return `/api/avatar?style=big-smile&seed=${userId}&backgroundColor=84cc16&radius=50`;
  }
};

const isDefaultAvatar = (url: string | null | undefined): boolean => {
  if (!url) return true;
  if (url.startsWith('/avatars/')) return true;
  if (url.startsWith('/api/avatar')) return true;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'api.dicebear.com';
  } catch {
    return false;
  }
};

// Role-based accent colors for the left border
const roleAccentColors = {
  ADMIN: 'border-l-purple-500',
  RESPONDER: 'border-l-blue-500',
  USER: 'border-l-gray-400',
};

export function UserCard({
  user,
  selected,
  onSelect,
  isCurrentUser,
  isAdmin,
  teams,
  onActivate,
  onDeactivate,
  onDelete,
  onGenerateInvite,
  onUpdateRole,
  onAddToTeam,
}: UserCardProps) {
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const avatarUrl =
    user.avatarUrl && !isDefaultAvatar(user.avatarUrl)
      ? user.avatarUrl
      : getDefaultAvatar(user.gender, user.id);

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-200',
    INVITED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    DISABLED: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const roleColors = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    RESPONDER: 'bg-blue-100 text-blue-800 border-blue-200',
    USER: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const handleDeactivate = () => {
    setShowDeactivateDialog(false);
    onDeactivate?.();
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete?.();
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-4 p-4 rounded-lg border-2 border-l-4',
          'transition-all duration-300 ease-out',
          // Hover animations
          'hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01]',
          // Role-based left border accent
          roleAccentColors[user.role as keyof typeof roleAccentColors] || 'border-l-gray-400',
          selected
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-border bg-card hover:border-primary/30'
        )}
      >
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          name="userIds"
          value={user.id}
          form="bulk-users-form"
          checked={selected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        />

        {/* Avatar with subtle animation */}
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-md transition-transform duration-300 group-hover:scale-105">
          <AvatarImage src={avatarUrl} alt={user.name} className="object-cover" />
          <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/10 via-primary/5 to-background">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">{user.name}</h3>
            {isCurrentUser && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                You
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>

          {(user.jobTitle || user.department) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {user.jobTitle && (
                <div className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user.jobTitle}</span>
                </div>
              )}
              {user.department && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user.department}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Badges and Controls */}
        <div className="flex flex-col items-end gap-2 min-w-[200px]">
          <div className="flex items-center gap-2">
            {/* Role Badge/Select */}
            {!isCurrentUser && isAdmin && onUpdateRole ? (
              <select
                value={user.role}
                onChange={e => onUpdateRole(e.target.value)}
                className="h-6 text-[10px] font-semibold px-2 rounded border border-purple-200 bg-purple-100 text-purple-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="RESPONDER">RESPONDER</option>
                <option value="USER">USER</option>
              </select>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-semibold',
                  roleColors[user.role as keyof typeof roleColors]
                )}
              >
                {user.role}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-semibold',
                statusColors[user.status as keyof typeof statusColors]
              )}
            >
              {user.status}
            </Badge>
          </div>

          {/* Team Assignment */}
          {!isCurrentUser && isAdmin && onAddToTeam && teams.length > 0 && (
            <select
              onChange={e => {
                if (e.target.value) {
                  onAddToTeam(e.target.value);
                  e.target.value = '';
                }
              }}
              className="h-6 text-[10px] px-2 rounded border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer w-full"
            >
              <option value="">+ Add to team</option>
              {teams
                .filter(team => !user.teamMemberships?.some(m => m.teamId === team.id))
                .map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          )}

          {/* Teams */}
          {user.teamMemberships && user.teamMemberships.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 justify-end">
              {user.teamMemberships.slice(0, 2).map(member => (
                <Badge
                  key={member.id}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                  title={`${member.team.name} (${member.role})`}
                >
                  {member.team.name}
                </Badge>
              ))}
              {user.teamMemberships.length > 2 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  +{user.teamMemberships.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isCurrentUser && isAdmin && (
          <div className="flex flex-col gap-1.5">
            {/* Password Reset Button */}
            {(user.status === 'ACTIVE' || user.status === 'INVITED') && (
              <GenerateResetLinkButton
                userId={user.id}
                userName={user.name}
                userStatus={user.status}
              />
            )}

            {user.status === 'ACTIVE' && onDeactivate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeactivateDialog(true)}
                className="h-7 text-xs text-orange-600 bg-orange-50 border border-orange-200 hover:text-orange-700 hover:bg-orange-100 gap-1"
              >
                <UserX className="h-3 w-3" />
                Deactivate
              </Button>
            )}
            {user.status === 'DISABLED' && onActivate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onActivate}
                className="h-7 text-xs text-green-600 bg-green-50 border border-green-200 hover:text-green-700 hover:bg-green-100 gap-1"
              >
                <UserCheck className="h-3 w-3" />
                Activate
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="h-7 text-xs text-red-600 bg-red-50 border border-red-200 hover:text-red-700 hover:bg-red-100 gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Deactivate User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{user.name}</strong>? They will lose
              access to the system but their data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete User Permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-red-600 font-semibold">This action cannot be undone.</span>
              <br />
              <br />
              Are you sure you want to permanently delete <strong>{user.name}</strong>? All their
              data, including activity history and assignments, will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
