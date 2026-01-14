'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { DateTimeInput } from '@/components/ui';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/shadcn/sheet';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Layers, Loader2, Plus, CalendarClock } from 'lucide-react';

type LayerCreateFormProps = {
  scheduleId: string;
  canManageSchedules: boolean;
  createLayer: (scheduleId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
  defaultStartDate: string;
};

export default function LayerCreateForm({
  scheduleId,
  canManageSchedules,
  createLayer,
  defaultStartDate,
}: LayerCreateFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Local state for quick interactions
  const [rotationDuration, setRotationDuration] = useState<string>('168'); // Default 1 week hours

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await createLayer(scheduleId, formData);
        if (result?.error) {
          showToast(result.error, 'error');
        } else {
          showToast('Layer created successfully', 'success');
          setOpen(false);
          router.refresh();
        }
      } catch (error) {
        showToast('Failed to create layer', 'error');
      }
    });
  };

  const setQuickDuration = (hours: number) => {
    setRotationDuration(hours.toString());
  };

  if (!canManageSchedules) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-10 gap-2 text-sm font-semibold border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Rotation
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </span>
            Add Rotation Layer
          </SheetTitle>
          <SheetDescription>
            Create a new rotation sequence. Defines who is on-call and for how long.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name">Layer Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Primary On-Call, Weekday Shift"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-3">
            <Label>Rotation Length (Handover)</Label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Button
                type="button"
                variant={rotationDuration === '24' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setQuickDuration(24)}
                className="text-xs"
              >
                Daily
              </Button>
              <Button
                type="button"
                variant={rotationDuration === '168' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setQuickDuration(168)}
                className="text-xs"
              >
                Weekly
              </Button>
              <Button
                type="button"
                variant={rotationDuration === '336' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setQuickDuration(336)}
                className="text-xs"
              >
                2 Weeks
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                name="rotationLengthHours"
                value={rotationDuration}
                onChange={e => setRotationDuration(e.target.value)}
                required
                min="1"
                disabled={isPending}
                className="w-28"
              />
              <span className="text-sm text-slate-500">hours</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="start">Start Date & Time</Label>
            <div className="p-3 border border-slate-200/80 rounded-lg bg-slate-50/70">
              <DateTimeInput
                name="start"
                value={defaultStartDate}
                required
                fullWidth
                disabled={isPending}
              />
              <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                First shift starts at this time.
              </p>
            </div>
          </div>

          {/* User ordering hint */}
          <div className="p-3 rounded-md bg-blue-50/70 border border-blue-100 text-xs text-blue-700">
            <strong>Tip:</strong> You can add users and reorder the rotation after creating the
            layer.
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Layer'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
