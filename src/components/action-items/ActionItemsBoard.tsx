'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Label } from '@/components/ui/shadcn/label';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import { cn } from '@/lib/utils';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  postmortemId: string;
  postmortemTitle: string;
  incidentId: string;
  incidentTitle: string;
  serviceName: string;
  createdAt: Date;
}

interface ActionItemsBoardProps {
  actionItems: ActionItem[];
  users: Array<{ id: string; name: string; email: string }>;
  canManage: boolean;
  view: 'board' | 'list';
  filters: {
    status?: string;
    owner?: string;
    priority?: string;
  };
}

interface FilterPanelProps {
  users: Array<{ id: string; name: string; email: string }>;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedOwner: string;
  setSelectedOwner: (value: string) => void;
  selectedPriority: string;
  setSelectedPriority: (value: string) => void;
  buildFilterUrl: (updates: { status?: string; owner?: string; priority?: string }) => string;
}

interface ActionItemCardProps {
  item: ActionItem;
  users: Array<{ id: string; name: string; email: string }>;
  userTimeZone: string;
}

const STATUS_CONFIG = {
  OPEN: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500/40',
    hoverBorderColor: 'hover:border-blue-500/60',
    dotGlow: 'shadow-[0_0_8px_rgba(59,130,246,0.6)]',
    label: 'Open',
    badgeVariant: 'info' as const,
  },
  IN_PROGRESS: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500/40',
    hoverBorderColor: 'hover:border-amber-500/60',
    dotGlow: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    label: 'In Progress',
    badgeVariant: 'warning' as const,
  },
  COMPLETED: {
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500/40',
    hoverBorderColor: 'hover:border-green-500/60',
    dotGlow: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    label: 'Completed',
    badgeVariant: 'success' as const,
  },
  BLOCKED: {
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500/40',
    hoverBorderColor: 'hover:border-red-500/60',
    dotGlow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    label: 'Blocked',
    badgeVariant: 'danger' as const,
  },
};

const PRIORITY_CONFIG = {
  HIGH: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    label: 'High',
  },
  MEDIUM: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/20',
    label: 'Medium',
  },
  LOW: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/20',
    label: 'Low',
  },
};

function getOwnerName(
  ownerId: string | undefined,
  users: Array<{ id: string; name: string; email: string }>
) {
  if (!ownerId) return 'Unassigned';
  const user = users.find(u => u.id === ownerId);
  return user?.name || 'Unknown';
}

function isOverdue(item: ActionItem) {
  if (!item.dueDate || item.status === 'COMPLETED') return false;
  return new Date(item.dueDate) < new Date();
}

// Extracted FilterPanel component
function FilterPanel({
  users,
  selectedStatus,
  setSelectedStatus,
  selectedOwner,
  setSelectedOwner,
  selectedPriority,
  setSelectedPriority,
  buildFilterUrl,
}: FilterPanelProps) {
  return (
    <Card className="p-5 mb-6 bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-md rounded-xl">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <div className="space-y-2">
          <Label htmlFor="status-filter" className="text-sm font-medium">
            Status
          </Label>
          <Select
            value={selectedStatus}
            onValueChange={value => {
              const newValue = value === 'all' ? '' : value;
              setSelectedStatus(newValue);
              window.location.href = buildFilterUrl({
                status: newValue || undefined,
                owner: selectedOwner || undefined,
                priority: selectedPriority || undefined,
              });
            }}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner-filter" className="text-sm font-medium">
            Owner
          </Label>
          <Select
            value={selectedOwner}
            onValueChange={value => {
              const newValue = value === 'all' ? '' : value;
              setSelectedOwner(newValue);
              window.location.href = buildFilterUrl({
                status: selectedStatus || undefined,
                owner: newValue || undefined,
                priority: selectedPriority || undefined,
              });
            }}
          >
            <SelectTrigger id="owner-filter">
              <SelectValue placeholder="All Owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority-filter" className="text-sm font-medium">
            Priority
          </Label>
          <Select
            value={selectedPriority}
            onValueChange={value => {
              const newValue = value === 'all' ? '' : value;
              setSelectedPriority(newValue);
              window.location.href = buildFilterUrl({
                status: selectedStatus || undefined,
                owner: selectedOwner || undefined,
                priority: newValue || undefined,
              });
            }}
          >
            <SelectTrigger id="priority-filter">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

// Extracted ActionItemCard component
function ActionItemCard({ item, users, userTimeZone }: ActionItemCardProps) {
  const overdue = isOverdue(item);
  const statusConfig = STATUS_CONFIG[item.status];
  const priorityConfig = PRIORITY_CONFIG[item.priority];

  return (
    <div
      className={cn(
        'p-4 bg-white rounded-md cursor-pointer',
        'border-2 border-l-4',
        statusConfig.borderColor,
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-lg'
      )}
      onClick={() => (window.location.href = `/postmortems/${item.incidentId}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-semibold',
                priorityConfig.bgColor,
                priorityConfig.color
              )}
            >
              {priorityConfig.label}
            </span>
            {overdue && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-500">
                Overdue
              </span>
            )}
          </div>
          <h4 className="text-base font-semibold mb-1">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground mb-2">
              {item.description.substring(0, 100)}
              {item.description.length > 100 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
      <div className="pt-2 border-t border-slate-200 text-xs text-muted-foreground">
        <div className="mb-1">👤 {getOwnerName(item.owner, users)}</div>
        {item.dueDate && (
          <div className="mb-1">
            📅 {formatDateTime(item.dueDate, userTimeZone, { format: 'date' })}
          </div>
        )}
        <div>
          📋{' '}
          <Link href={`/postmortems/${item.incidentId}`} className="text-primary hover:underline">
            {item.postmortemTitle}
          </Link>
        </div>
        <div className="text-[0.7rem] mt-1">Incident: {item.incidentTitle}</div>
      </div>
    </div>
  );
}

export default function ActionItemsBoard({
  actionItems,
  users,
  canManage: _canManage,
  view,
  filters,
}: ActionItemsBoardProps) {
  const { userTimeZone } = useTimezone();
  const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
  const [selectedOwner, setSelectedOwner] = useState(filters.owner || '');
  const [selectedPriority, setSelectedPriority] = useState(filters.priority || '');

  const buildFilterUrl = (updates: { status?: string; owner?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (updates.status) params.set('status', updates.status);
    if (updates.owner) params.set('owner', updates.owner);
    if (updates.priority) params.set('priority', updates.priority);
    if (view) params.set('view', view);
    return `/action-items?${params.toString()}`;
  };

  const groupedByStatus = {
    OPEN: actionItems.filter(item => item.status === 'OPEN'),
    IN_PROGRESS: actionItems.filter(item => item.status === 'IN_PROGRESS'),
    COMPLETED: actionItems.filter(item => item.status === 'COMPLETED'),
    BLOCKED: actionItems.filter(item => item.status === 'BLOCKED'),
  };

  const filterPanelProps: FilterPanelProps = {
    users,
    selectedStatus,
    setSelectedStatus,
    selectedOwner,
    setSelectedOwner,
    selectedPriority,
    setSelectedPriority,
    buildFilterUrl,
  };

  if (view === 'board') {
    return (
      <div>
        <FilterPanel {...filterPanelProps} />

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-5">
          {Object.entries(groupedByStatus).map(([status, items]) => {
            const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
            return (
              <Card
                key={status}
                className={cn(
                  'p-5 min-h-[500px] rounded-xl',
                  'bg-gradient-to-br from-white to-slate-50',
                  'border-2',
                  config.borderColor,
                  'shadow-md'
                )}
              >
                <CardHeader className="p-0 mb-5 pb-4 border-b-2 border-opacity-20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={cn('text-lg font-bold flex items-center gap-2', config.color)}>
                      <span
                        className={cn('w-2 h-2 rounded-full', config.bgColor, config.dotGlow)}
                      />
                      {config.label}
                    </h3>
                    <Badge variant={config.badgeVariant} size="sm" className="font-bold">
                      {items.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex flex-col gap-3">
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">No items</div>
                  ) : (
                    items.map(item => (
                      <ActionItemCard
                        key={item.id}
                        item={item}
                        users={users}
                        userTimeZone={userTimeZone}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <FilterPanel {...filterPanelProps} />

      {/* List View */}
      <div className="flex flex-col gap-3">
        {actionItems.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-white to-slate-50 border-slate-200 rounded-lg">
            <p className="text-muted-foreground">No action items found matching the filters.</p>
          </Card>
        ) : (
          actionItems.map(item => {
            const overdue = isOverdue(item);
            const statusConfig = STATUS_CONFIG[item.status];
            const priorityConfig = PRIORITY_CONFIG[item.priority];

            return (
              <Card
                key={item.id}
                className={cn(
                  'p-5 rounded-lg cursor-pointer',
                  'bg-gradient-to-br from-white to-slate-50',
                  'border-2 border-l-4',
                  statusConfig.borderColor,
                  'transition-all duration-200 ease-out',
                  'hover:translate-x-1 hover:shadow-lg'
                )}
                onClick={() => (window.location.href = `/postmortems/${item.incidentId}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={statusConfig.badgeVariant}
                        size="xs"
                        className="font-semibold"
                      >
                        {statusConfig.label}
                      </Badge>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold',
                          priorityConfig.bgColor,
                          priorityConfig.color
                        )}
                      >
                        {priorityConfig.label} Priority
                      </span>
                      {overdue && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-500">
                          Overdue
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-base text-muted-foreground mb-2">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 pt-3 border-t border-slate-200 text-sm text-muted-foreground flex-wrap">
                  <span>👤 {getOwnerName(item.owner, users)}</span>
                  {item.dueDate && (
                    <span>
                      📅 Due: {formatDateTime(item.dueDate, userTimeZone, { format: 'date' })}
                    </span>
                  )}
                  <span>
                    📋{' '}
                    <Link
                      href={`/postmortems/${item.incidentId}`}
                      className="text-primary hover:underline"
                    >
                      {item.postmortemTitle}
                    </Link>
                  </span>
                  <span>
                    🔗{' '}
                    <Link
                      href={`/incidents/${item.incidentId}`}
                      className="text-primary hover:underline"
                    >
                      {item.incidentTitle}
                    </Link>
                  </span>
                  <span>🏷️ {item.serviceName}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
