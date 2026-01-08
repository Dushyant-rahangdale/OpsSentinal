'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { DateTimeInput } from '@/components/ui';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Label } from '@/components/ui/shadcn/label';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import { AlertCircle, Clock, Loader2, Plus } from 'lucide-react';

type OverrideFormProps = {
  scheduleId: string;
  users: Array<{ id: string; name: string }>;
  canManageSchedules: boolean;
  createOverride: (
    scheduleId: string,
    formData: FormData
  ) => Promise<{ error?: string } | undefined>;
};

export default function OverrideForm({
  scheduleId,
  users,
  canManageSchedules,
  createOverride,
}: OverrideFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await createOverride(scheduleId, formData);
        if (result?.error) {
          showToast(result.error, 'error');
        } else {
          const userId = formData.get('userId') as string;
          const userName = users.find(u => u.id === userId)?.name || 'User';
          showToast(`Override created for ${userName}`, 'success');
          router.refresh();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(errorMessage || 'Failed to create override', 'error');
      }
    });
  };

  if (!canManageSchedules) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            Overrides
          </CardTitle>
          <CardDescription>Admin or Responder role required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pointer-events-none">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Temporarily replace on-call coverage. Times use your browser local time.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">On-call user</Label>
              <select
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              >
                <option>Select a responder</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Replace (optional)</Label>
              <select
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              >
                <option>Any user</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Start</Label>
                <input
                  type="datetime-local"
                  disabled
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">End</Label>
                <input
                  type="datetime-local"
                  disabled
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                />
              </div>
            </div>

            <Button disabled className="w-full">
              Create Override
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Overrides
        </CardTitle>
        <CardDescription className="text-xs">
          Temporarily replace on-call coverage. Times use your browser local time.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId" className="text-sm">
              On-call user <span className="text-red-500">*</span>
            </Label>
            <select
              id="userId"
              name="userId"
              required
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a responder</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="replacesUserId" className="text-sm">
              Replace (optional)
            </Label>
            <select
              id="replacesUserId"
              name="replacesUserId"
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Any user</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start" className="text-sm">
                Start <span className="text-red-500">*</span>
              </Label>
              <DateTimeInput name="start" required fullWidth disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end" className="text-sm">
                End <span className="text-red-500">*</span>
              </Label>
              <DateTimeInput name="end" required fullWidth disabled={isPending} />
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full gap-2">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Override
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
