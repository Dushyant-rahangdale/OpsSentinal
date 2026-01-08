'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import SchedulePreview from './SchedulePreview';
import { DateTimeInput } from '@/components/ui';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import { AlertCircle, Plus, Eye, Loader2, Info, Layers } from 'lucide-react';

type LayerCreateFormProps = {
  scheduleId: string;
  canManageSchedules: boolean;
  createLayer: (scheduleId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
  defaultStartDate: string;
  users?: Array<{ id: string; name: string }>;
  timeZone?: string;
};

export default function LayerCreateForm({
  scheduleId,
  canManageSchedules,
  createLayer,
  defaultStartDate,
  users = [],
  timeZone = 'UTC',
}: LayerCreateFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    name: string;
    start: string;
    end: string;
    rotationLengthHours: number;
    users: string[];
  } | null>(null);

  const handlePreview = (formData: FormData) => {
    const name = formData.get('name') as string;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string;
    const rotationLengthHours = Number(formData.get('rotationLengthHours'));

    if (
      name &&
      start &&
      rotationLengthHours &&
      !isNaN(rotationLengthHours) &&
      rotationLengthHours > 0
    ) {
      setPreviewData({
        name,
        start,
        end: end || '',
        rotationLengthHours,
        users: [],
      });
      setShowPreview(true);
    } else {
      setShowPreview(false);
      setPreviewData(null);
    }
  };

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
          router.refresh();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(errorMessage || 'Failed to create layer', 'error');
      }
    });
  };

  if (!canManageSchedules) {
    return (
      <Card className="border-orange-200 bg-orange-50/50 opacity-70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-orange-600" />
            Add Layer
            <span
              title="Layers allow you to run multiple rotation patterns simultaneously. For example, you can have a 'day' layer (6 AM - 6 PM) and a 'night' layer (6 PM - 6 AM) to provide 24/7 coverage with different teams."
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-100 text-sky-900 text-[10px] font-semibold cursor-help border border-sky-200"
            >
              <Info className="h-3 w-3" />
            </span>
          </CardTitle>
          <CardDescription className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="h-4 w-4" />
            You don't have access to create layers. Admin or Responder role required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pointer-events-none opacity-50">
          <div className="space-y-2">
            <Label htmlFor="name-disabled" className="text-xs">
              Layer name
            </Label>
            <Input
              id="name-disabled"
              name="name"
              placeholder="Primary rotation"
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rotation-disabled" className="text-xs">
              Rotation length (hours)
            </Label>
            <Input
              id="rotation-disabled"
              name="rotationLengthHours"
              type="number"
              min="1"
              defaultValue="24"
              disabled
              className="bg-muted"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-disabled" className="text-xs">
                Start
              </Label>
              <Input
                id="start-disabled"
                type="datetime-local"
                name="start"
                defaultValue={defaultStartDate}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-disabled" className="text-xs">
                End (optional)
              </Label>
              <Input
                id="end-disabled"
                type="datetime-local"
                name="end"
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <Button type="button" disabled className="w-full">
            Create layer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Add Layer
          <span
            title="Layers allow you to run multiple rotation patterns simultaneously. For example, you can have a 'day' layer (6 AM - 6 PM) and a 'night' layer (6 PM - 6 AM) to provide 24/7 coverage with different teams."
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-100 text-sky-900 text-[10px] font-semibold cursor-help border border-sky-200 hover:bg-sky-200 transition-colors"
          >
            <Info className="h-3 w-3" />
          </span>
        </CardTitle>
        <CardDescription>
          Create rotation layers with different schedules and durations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          onChange={e => {
            const form = e.currentTarget;
            const formData = new FormData(form);
            handlePreview(formData);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs">
              Layer name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Primary rotation"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rotationLengthHours" className="text-xs">
              Rotation length (hours) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rotationLengthHours"
              name="rotationLengthHours"
              type="number"
              min="1"
              defaultValue="24"
              required
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start" className="text-xs">
                Start <span className="text-red-500">*</span>
              </Label>
              <DateTimeInput
                name="start"
                value={defaultStartDate}
                required
                fullWidth
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end" className="text-xs">
                End (optional)
              </Label>
              <DateTimeInput name="end" fullWidth disabled={isPending} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={e => {
                e.preventDefault();
                const form = e.currentTarget.closest('form');
                if (form) {
                  const formData = new FormData(form);
                  handlePreview(formData);
                }
              }}
              className="flex-1 gap-2"
              disabled={isPending}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1 gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Layer
                </>
              )}
            </Button>
          </div>
        </form>

        {showPreview && previewData && (
          <div className="mt-4 pt-4 border-t">
            <SchedulePreview
              layers={[
                {
                  id: 'preview',
                  name: previewData.name,
                  start: new Date(previewData.start),
                  end: previewData.end ? new Date(previewData.end) : null,
                  rotationLengthHours: previewData.rotationLengthHours,
                  users: previewData.users.map((userId, idx) => ({
                    userId,
                    position: idx + 1,
                    user: { name: users.find(u => u.id === userId)?.name || 'User' },
                  })),
                },
              ]}
              timeZone={timeZone}
              startDate={previewData.start ? new Date(previewData.start) : new Date()}
              endDate={
                previewData.start
                  ? new Date(new Date(previewData.start).getTime() + 7 * 24 * 60 * 60 * 1000)
                  : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
