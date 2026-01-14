'use client';

import { useTransition, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { DateTimeInput } from '@/components/ui';
import { formatDateForInput } from '@/lib/timezone';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { getDefaultAvatar } from '@/lib/avatar';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';
import {
  ChevronDown,
  Trash2,
  Edit3,
  Users,
  Clock,
  ArrowUp,
  ArrowDown,
  Layers,
  Info,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type LayerCardProps = {
  layer: {
    id: string;
    name: string;
    start: Date;
    end: Date | null;
    rotationLengthHours: number;
    users: Array<{
      userId: string;
      position: number;
      user: { name: string; avatarUrl?: string | null; gender?: string | null };
    }>;
  };
  scheduleId: string;
  timeZone: string;
  users: Array<{ id: string; name: string }>;
  canManageSchedules: boolean;
  updateLayer: (layerId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
  deleteLayer: (scheduleId: string, layerId: string) => Promise<{ error?: string } | undefined>;
  addLayerUser: (layerId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
  moveLayerUser: (
    layerId: string,
    userId: string,
    direction: 'up' | 'down'
  ) => Promise<{ error?: string } | undefined>;
  removeLayerUser: (layerId: string, userId: string) => Promise<{ error?: string } | undefined>;
  colorIndex?: number;
};

const LAYER_COLORS = [
  { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  {
    bg: 'bg-violet-500',
    light: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
  },
  {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
];

function formatShortTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone,
  }).format(date);
}

// Info Tooltip Component for consistent help icons
function HelpTip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-help"
          >
            <Info className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-[250px] text-xs z-50 bg-slate-900 text-white border-slate-800"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function LayerCard({
  layer,
  scheduleId,
  timeZone,
  users,
  canManageSchedules,
  updateLayer,
  deleteLayer,
  addLayerUser,
  moveLayerUser,
  removeLayerUser,
  colorIndex = 0,
}: LayerCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRespondersOpen, setIsRespondersOpen] = useState(false);

  const color = LAYER_COLORS[colorIndex % LAYER_COLORS.length];

  const handleDelete = useCallback(async () => {
    setShowDeleteConfirm(false);
    startTransition(async () => {
      const result = await deleteLayer(scheduleId, layer.id);
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Layer deleted', 'success');
        router.refresh();
      }
    });
  }, [scheduleId, layer.id, deleteLayer, showToast, router]);

  const handleUpdate = useCallback(
    async (formData: FormData) => {
      setIsUpdating(true);
      startTransition(async () => {
        const result = await updateLayer(layer.id, formData);
        if (result?.error) {
          showToast(result.error, 'error');
        } else {
          showToast('Layer updated', 'success');
          setIsEditOpen(false);
          router.refresh();
        }
        setIsUpdating(false);
      });
    },
    [layer.id, updateLayer, showToast, router]
  );

  const handleAddUser = useCallback(
    async (formData: FormData) => {
      startTransition(async () => {
        const result = await addLayerUser(layer.id, formData);
        if (result?.error) {
          showToast(result.error, 'error');
        } else {
          showToast('Responder added', 'success');
          router.refresh();
        }
      });
    },
    [layer.id, addLayerUser, showToast, router]
  );

  const handleMoveUser = useCallback(
    async (userId: string, direction: 'up' | 'down') => {
      startTransition(async () => {
        const result = await moveLayerUser(layer.id, userId, direction);
        if (result?.error) {
          showToast(result.error, 'error');
        } else {
          router.refresh();
        }
      });
    },
    [layer.id, moveLayerUser, showToast, router]
  );

  const handleRemoveUser = useCallback(
    async (userId: string) => {
      startTransition(async () => {
        const result = await removeLayerUser(layer.id, userId);
        if (result?.error) {
          showToast(result.error, 'error');
        } else {
          showToast('Responder removed', 'success');
          router.refresh();
        }
      });
    },
    [layer.id, removeLayerUser, showToast, router]
  );

  const availableUsers = useMemo(
    () => users.filter(user => !layer.users.some(layerUser => layerUser.userId === user.id)),
    [users, layer.users]
  );

  return (
    <>
      <Card
        className={cn('overflow-hidden border-l-4 border-slate-200/80 shadow-sm', color.border)}
      >
        {/* Compact Header */}
        <div className="flex items-start justify-between gap-3 p-3 bg-slate-50/70">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', color.light)}>
              <Layers className={cn('h-4 w-4', color.text)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800 truncate">{layer.name}</h3>
                <HelpTip>
                  <p>
                    <strong>Layer:</strong> A rotation pattern that cycles through responders.
                    Multiple layers can run simultaneously.
                  </p>
                </HelpTip>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                <Badge variant="secondary" size="xs">
                  {layer.rotationLengthHours}h rotation
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatShortTime(new Date(layer.start), timeZone)}
                  {layer.end
                    ? ` - ${formatShortTime(new Date(layer.end), timeZone)}`
                    : ' - Open ended'}
                </span>
              </div>
            </div>
          </div>

          {canManageSchedules && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditOpen(!isEditOpen)}
                className={cn('h-7 w-7', isEditOpen && 'bg-slate-200')}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <CardContent className="p-0">
          {/* Compact Edit Form */}
          {isEditOpen && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-1 duration-150">
              <form action={handleUpdate} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase">Name</Label>
                    <Input
                      name="name"
                      defaultValue={layer.name}
                      required
                      disabled={isUpdating}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                      Rotation (hrs)
                      <HelpTip>How long each person is on-call before the next takes over.</HelpTip>
                    </Label>
                    <Input
                      name="rotationLengthHours"
                      type="number"
                      min="1"
                      defaultValue={layer.rotationLengthHours}
                      required
                      disabled={isUpdating}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase">Start</Label>
                    <DateTimeInput
                      name="start"
                      value={formatDateForInput(new Date(layer.start), timeZone)}
                      required
                      fullWidth
                      disabled={isUpdating}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                      End
                      <HelpTip>Optional. Leave empty for indefinite rotation.</HelpTip>
                    </Label>
                    <DateTimeInput
                      name="end"
                      value={layer.end ? formatDateForInput(new Date(layer.end), timeZone) : ''}
                      fullWidth
                      disabled={isUpdating}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditOpen(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isUpdating} className="h-7 text-xs">
                    {isUpdating ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Responders Collapsible */}
          <Collapsible open={isRespondersOpen} onOpenChange={setIsRespondersOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-2.5 px-3 text-left hover:bg-slate-50 transition-colors border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users className="h-3 w-3" />
                  <span className="font-medium">Responders</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-slate-100">
                    {layer.users.length}
                  </Badge>
                  <HelpTip>
                    <p>
                      <strong>Responders:</strong> Team members in this rotation. Order determines
                      who's on-call first.
                    </p>
                  </HelpTip>
                </div>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 text-slate-400 transition-transform',
                    isRespondersOpen && 'rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-1">
                {layer.users.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-slate-200 rounded-md bg-slate-50/50">
                    <Users className="h-5 w-5 text-slate-300 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400">No responders yet</p>
                  </div>
                ) : (
                  layer.users.map((layerUser, index) => (
                    <div
                      key={layerUser.userId}
                      className={cn(
                        'flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 group',
                        isPending && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center',
                            index === 0
                              ? `${color.light} ${color.text}`
                              : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {index + 1}
                        </span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={
                              layerUser.user.avatarUrl ||
                              getDefaultAvatar(layerUser.user.gender, layerUser.user.name)
                            }
                          />
                          <AvatarFallback className="text-[8px] bg-slate-100">
                            {layerUser.user.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-700">
                          {layerUser.user.name}
                        </span>
                        {index === 0 && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1 text-[8px] bg-emerald-50 text-emerald-600 border-emerald-100"
                          >
                            NEXT
                          </Badge>
                        )}
                      </div>
                      {canManageSchedules && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveUser(layerUser.userId, 'up')}
                            disabled={index === 0 || isPending}
                            className="h-5 w-5"
                          >
                            <ArrowUp className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveUser(layerUser.userId, 'down')}
                            disabled={index === layer.users.length - 1 || isPending}
                            className="h-5 w-5"
                          >
                            <ArrowDown className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveUser(layerUser.userId)}
                            disabled={isPending}
                            className="h-5 w-5 text-slate-400 hover:text-red-500"
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Add Responder */}
                {canManageSchedules && availableUsers.length > 0 && (
                  <form action={handleAddUser} className="mt-2">
                    <select
                      name="userId"
                      required
                      disabled={isPending}
                      className="w-full h-7 text-xs rounded-md border border-slate-200 bg-white px-2 hover:border-blue-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    >
                      <option value="">+ Add responder...</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" disabled={isPending} className="hidden">
                      Add
                    </Button>
                  </form>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete Layer
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Delete <strong>{layer.name}</strong>? This removes all responders from this layer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-8 text-xs bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
