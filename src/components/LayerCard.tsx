'use client';

import { useTransition, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { DateTimeInput } from '@/components/ui';
import { formatDateForInput } from '@/lib/timezone';
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
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Users,
  Clock,
  ArrowUp,
  ArrowDown,
  UserPlus,
  Layers,
  HelpCircle,
  AlertTriangle,
  Loader2,
  UserX,
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
      user: {
        name: string;
      };
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
};

function formatShortTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone,
  }).format(date);
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
}: LayerCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRespondersOpen, setIsRespondersOpen] = useState(true);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleDelete = useCallback(async () => {
    setShowDeleteConfirm(false);
    startTransition(async () => {
      const result = await deleteLayer(scheduleId, layer.id);
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Layer deleted successfully', 'success');
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
          showToast('Layer updated successfully', 'success');
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
          const userId = formData.get('userId') as string;
          const userName = users.find(u => u.id === userId)?.name || 'User';
          showToast(`${userName} added to layer`, 'success');
          router.refresh();
        }
      });
    },
    [layer.id, addLayerUser, users, showToast, router]
  );

  const handleMoveUser = useCallback(
    async (userId: string, direction: 'up' | 'down') => {
      startTransition(async () => {
        const result = await moveLayerUser(layer.id, userId, direction);
        if (result?.error) {
          showToast(result.error, 'error');
        } else {
          showToast('User position updated', 'success');
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
          const userName = layer.users.find(u => u.userId === userId)?.user.name || 'User';
          showToast(`${userName} removed from layer`, 'success');
          router.refresh();
        }
      });
    },
    [layer.id, layer.users, removeLayerUser, showToast, router]
  );

  // Memoize availableUsers calculation to avoid recalculation on every render
  const availableUsers = useMemo(
    () => users.filter(user => !layer.users.some(layerUser => layerUser.userId === user.id)),
    [users, layer.users]
  );

  return (
    <>
      <Card className="mb-6">
        {/* Layer Header */}
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{layer.name}</CardTitle>
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 border border-blue-200 cursor-help"
                  title="A layer defines a rotation pattern. Multiple layers can run simultaneously to provide different coverage (e.g., day shift and night shift)."
                >
                  <HelpCircle className="h-3 w-3 text-blue-700" />
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatShortTime(new Date(layer.start), timeZone)} {timeZone}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {layer.rotationLengthHours}h rotation
                </Badge>
                {layer.end && (
                  <span className="text-xs">
                    ends {formatShortTime(new Date(layer.end), timeZone)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {canManageSchedules ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(!isEditOpen)}
                    className="gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Layer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" disabled title="Admin or Responder role required">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Edit Layer Form */}
          {isEditOpen && (
            <Card
              className={cn(
                canManageSchedules ? 'bg-muted/50' : 'border-orange-200 bg-orange-50/50'
              )}
            >
              <CardHeader>
                <CardTitle className="text-sm">Edit Layer Details</CardTitle>
                <CardDescription className="text-xs">
                  Update layer configuration and rotation settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManageSchedules ? (
                  <form action={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${layer.id}`}>Name</Label>
                        <Input
                          id={`name-${layer.id}`}
                          name="name"
                          defaultValue={layer.name}
                          required
                          disabled={isUpdating}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`rotation-${layer.id}`}>Rotation (hours)</Label>
                        <Input
                          id={`rotation-${layer.id}`}
                          name="rotationLengthHours"
                          type="number"
                          min="1"
                          defaultValue={layer.rotationLengthHours}
                          required
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`start-${layer.id}`}>Start</Label>
                        <DateTimeInput
                          name="start"
                          value={formatDateForInput(new Date(layer.start), timeZone)}
                          required
                          fullWidth
                          disabled={isUpdating}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`end-${layer.id}`}>
                          End <span className="text-xs text-muted-foreground">(Optional)</span>
                        </Label>
                        <DateTimeInput
                          name="end"
                          value={layer.end ? formatDateForInput(new Date(layer.end), timeZone) : ''}
                          fullWidth
                          disabled={isUpdating}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isUpdating}>
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 text-orange-900">
                    <AlertTriangle className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">
                        You don't have permission to edit this layer
                      </p>
                      <p className="text-xs text-orange-700">Admin or Responder role required.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Responders Section */}
          <Collapsible open={isRespondersOpen} onOpenChange={setIsRespondersOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Responders</CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {layer.users.length}
                      </Badge>
                    </div>
                    {isRespondersOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {layer.users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No responders in this layer.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {layer.users.map((layerUser, index) => (
                        <Card
                          key={layerUser.userId}
                          className={cn(
                            'transition-all duration-200',
                            isPending && 'opacity-60 pointer-events-none'
                          )}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs"
                                >
                                  #{index + 1}
                                </Badge>
                                <span className="font-medium text-sm">{layerUser.user.name}</span>
                              </div>

                              <div className="flex gap-2">
                                {canManageSchedules ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMoveUser(layerUser.userId, 'up')}
                                      disabled={index === 0 || isPending}
                                      className="h-8 w-8 p-0"
                                      title="Move up"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMoveUser(layerUser.userId, 'down')}
                                      disabled={index === layer.users.length - 1 || isPending}
                                      className="h-8 w-8 p-0"
                                      title="Move down"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveUser(layerUser.userId)}
                                      disabled={isPending}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                      title="Remove responder"
                                    >
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled
                                      className="h-8 w-8 p-0"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled
                                      className="h-8 w-8 p-0"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled
                                      className="h-8 w-8 p-0"
                                    >
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Add Responder */}
                  {canManageSchedules && availableUsers.length > 0 && (
                    <Card className="bg-muted/50 mt-4">
                      <CardContent className="p-4">
                        <form action={handleAddUser} className="flex gap-2">
                          <div className="flex-1">
                            <select
                              name="userId"
                              required
                              disabled={isPending}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Select responder to add</option>
                              {availableUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <Button type="submit" disabled={isPending} className="gap-2">
                            {isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4" />
                                Add
                              </>
                            )}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {canManageSchedules && availableUsers.length === 0 && layer.users.length > 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground bg-muted/30 rounded-lg">
                      All available users have been added to this layer
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Layer Permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-destructive font-semibold">This action cannot be undone.</span>
              <br />
              <br />
              Are you sure you want to delete the layer <strong>{layer.name}</strong>? This will
              remove all responders from this layer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Layer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
