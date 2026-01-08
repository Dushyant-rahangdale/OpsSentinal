'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import TimeZoneSelect from './TimeZoneSelect';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Edit, Loader2, Save, X } from 'lucide-react';

type ScheduleEditFormProps = {
  scheduleId: string;
  currentName: string;
  currentTimeZone: string;
  updateSchedule: (
    scheduleId: string,
    formData: FormData
  ) => Promise<{ error?: string } | undefined>;
  canManageSchedules: boolean;
};

export default function ScheduleEditForm({
  scheduleId,
  currentName,
  currentTimeZone,
  updateSchedule,
  canManageSchedules,
}: ScheduleEditFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await updateSchedule(scheduleId, formData);
        if (result?.error) {
          showToast(result.error, 'error');
        } else {
          showToast('Schedule updated successfully', 'success');
          setIsEditing(false);
          router.refresh();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(errorMessage || 'Failed to update schedule', 'error');
      }
    });
  };

  if (!canManageSchedules) {
    return null;
  }

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="mt-2 gap-2"
      >
        <Edit className="h-4 w-4" />
        Edit Schedule Settings
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-name" className="text-sm">
              Schedule Name
            </Label>
            <Input
              id="schedule-name"
              name="name"
              defaultValue={currentName}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-timezone" className="text-sm">
              Time Zone
            </Label>
            <TimeZoneSelect name="timeZone" defaultValue={currentTimeZone} disabled={isPending} />
            <p className="text-xs text-muted-foreground">
              All times in this schedule will be displayed in the selected timezone
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1 gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
