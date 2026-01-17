'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/shadcn/sheet';
import { Button } from '@/components/ui/shadcn/button';
import { Label } from '@/components/ui/shadcn/label';
import { Input } from '@/components/ui/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import { addHours } from 'date-fns';
import UserAvatar from '@/components/UserAvatar';

type OverrideFormProps = {
  scheduleId: string;
  users: Array<{ id: string; name: string; avatarUrl?: string | null; gender?: string | null }>;
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
  const [open, setOpen] = useState(false);

  // Quick Time State
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  // Helper for datetime-local format: YYYY-MM-DDTHH:mm
  const toLocalISOString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const handleQuickDuration = (hours: number) => {
    const now = new Date();
    // Round up to next 15 mins for cleanliness
    const remainder = 15 - (now.getMinutes() % 15);
    now.setMinutes(now.getMinutes() + remainder);

    const end = addHours(now, hours);

    setStartTime(toLocalISOString(now));
    setEndTime(toLocalISOString(end));
  };

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
          setOpen(false);
        }
      } catch (error) {
        showToast('Failed to create override', 'error');
      }
    });
  };

  if (!canManageSchedules) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-10 gap-2 text-sm font-semibold border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300"
        >
          <Clock className="h-3.5 w-3.5" />
          Add Override
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </span>
            Add Coverage Override
          </SheetTitle>
          <SheetDescription>
            Temporarily replace the on-call responder for a specific time window.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 p-4 bg-slate-50/70 rounded-lg border border-slate-200/80">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quick Select
            </Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDuration(1)}
              >
                1h
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDuration(4)}
              >
                4h
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDuration(8)}
              >
                8h
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDuration(24)}
              >
                24h
              </Button>
            </div>
          </div>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="userId">Who takes coverage?</Label>
              <Select name="userId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select responder" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          userId={user.id}
                          name={user.name}
                          gender={user.gender}
                          size="xs"
                        />
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="replacesUserId">Who are they replacing? (Optional)</Label>
              <Select name="replacesUserId">
                <SelectTrigger>
                  <SelectValue placeholder="Anyone on-call (Override all)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          userId={user.id}
                          name={user.name}
                          gender={user.gender}
                          size="xs"
                        />
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  name="start"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  name="end"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              'Confirm Override'
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
