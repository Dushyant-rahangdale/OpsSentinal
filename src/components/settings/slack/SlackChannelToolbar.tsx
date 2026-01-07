'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/shadcn/input';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { Search, RefreshCw, Zap, Loader2 } from 'lucide-react';

export type ChannelFilter = 'all' | 'connected' | 'invite' | 'auto';

interface ChannelSummary {
  total: number;
  connected: number;
  invite: number;
  autoAdd: number;
}

interface SlackChannelToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: ChannelFilter;
  onFilterChange: (filter: ChannelFilter) => void;
  summary: ChannelSummary;
  isLoading: boolean;
  isBulkConnecting: boolean;
  lastSyncTime?: Date | null;
  onRefresh: () => void;
  onBulkConnect: () => void;
  scopeHealthy: boolean;
}

export function SlackChannelToolbar({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  summary,
  isLoading,
  isBulkConnecting,
  lastSyncTime,
  onRefresh,
  onBulkConnect,
  scopeHealthy,
}: SlackChannelToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold">Available Channels</h4>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{summary.total} channels in workspace</span>
            <span className="text-xs">•</span>
            <Badge
              variant={scopeHealthy ? 'default' : 'destructive'}
              className={cn('text-xs', scopeHealthy && 'bg-emerald-600 hover:bg-emerald-600')}
            >
              {scopeHealthy ? 'Scopes healthy' : 'Scopes missing'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Refresh</span>
          </Button>

          {summary.autoAdd > 0 && (
            <Button
              size="sm"
              onClick={onBulkConnect}
              disabled={isBulkConnecting || isLoading}
              className="gap-1.5"
            >
              {isBulkConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Connect {summary.autoAdd} public
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={filter} onValueChange={v => onFilterChange(v as ChannelFilter)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              All
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {summary.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="connected" className="gap-1.5">
              Connected
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              >
                {summary.connected}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-1.5">
              Invite
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              >
                {summary.invite}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="auto" className="gap-1.5">
              Auto-add
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {summary.autoAdd}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {lastSyncTime && (
          <span className="text-xs text-muted-foreground self-center whitespace-nowrap">
            Last sync {lastSyncTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

export function SlackChannelToolbarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-80" />
      </div>
    </div>
  );
}

export default SlackChannelToolbar;
