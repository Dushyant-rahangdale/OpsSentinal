'use client';

import { useTransition } from 'react';
import { useToast } from './ToastProvider';
import { Button } from '@/components/ui/shadcn/button';
import { Label } from '@/components/ui/shadcn/label';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { AlertTriangle, Loader2, UserPlus } from 'lucide-react';

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
  teamId: _teamId,
}: TeamMemberFormProps) {
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const userId = formData.get('userId') as string;
    const role = formData.get('role') as string;
    const userName = availableUsers.find(u => u.id === userId)?.name || 'User';

    startTransition(async () => {
      const result = await addMember(formData);
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast(`${userName} added as ${role}`, 'success');
        form.reset();
      }
    });
  };

  if (!canManageMembers) {
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center gap-2 text-orange-900 mb-3">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-xs font-medium">No permission to add members</p>
          </div>
          <p className="text-xs text-orange-700">Admin or Responder role required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="userId" className="text-xs">
          Select User
        </Label>
        <select
          id="userId"
          name="userId"
          required
          disabled={isPending || availableUsers.length === 0}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {availableUsers.length === 0 ? 'All users are members' : 'Choose a user...'}
          </option>
          {availableUsers.map(user => (
            <option key={user.id} value={user.id}>
              {user.name} {user.status === 'DISABLED' ? '(Disabled)' : ''} - {user.email}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role" className="text-xs">
          Role
        </Label>
        <select
          id="role"
          name="role"
          defaultValue="MEMBER"
          disabled={!canAssignOwnerAdmin || isPending}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            !canAssignOwnerAdmin
              ? 'Admin or Team Owner access required to assign OWNER or ADMIN roles'
              : undefined
          }
        >
          <option value="OWNER" disabled={!canAssignOwnerAdmin}>
            Owner{!canAssignOwnerAdmin ? ' (Admin/Owner only)' : ''}
          </option>
          <option value="ADMIN" disabled={!canAssignOwnerAdmin}>
            Admin{!canAssignOwnerAdmin ? ' (Admin/Owner only)' : ''}
          </option>
          <option value="MEMBER">Member</option>
        </select>
        {!canAssignOwnerAdmin && (
          <p className="text-xs text-orange-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Admin or Team Owner access required for elevated roles
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={availableUsers.length === 0 || isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Add to Team
          </>
        )}
      </Button>
    </form>
  );
}
