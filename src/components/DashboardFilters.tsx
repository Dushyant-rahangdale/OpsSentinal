'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition, useCallback } from 'react';
import { Label } from '@/components/ui/shadcn/label';
import { Button } from '@/components/ui/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Badge } from '@/components/ui/shadcn/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/shadcn/card';
import { Filter, X, Briefcase, User, Activity, Flame } from 'lucide-react';

type Props = {
  initialStatus?: string;
  initialService?: string;
  initialAssignee?: string;
  initialUrgency?: string;
  services: { id: string; name: string }[];
  users: { id: string; name: string }[];
};

export default function DashboardFilters({
  initialStatus,
  initialService,
  initialAssignee,
  initialUrgency,
  services,
  users,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'ALL' && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when filters change
    params.delete('page');

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  const clearFilters = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const hasActiveFilters =
    (initialStatus && initialStatus !== 'ALL') ||
    (initialService && initialService !== '') ||
    (initialAssignee && initialAssignee !== '') ||
    (initialUrgency && initialUrgency !== '');

  return (
    <Card className="border-border/60 shadow-sm backdrop-blur-sm bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Filter className="h-4 w-4" /> Filter Incidents
            </CardTitle>
            <CardDescription>Refine your dashboard view</CardDescription>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
              disabled={isPending}
            >
              <X className="mr-1 h-3 w-3" /> Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Toggles */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={!initialStatus || initialStatus === 'ALL' ? 'default' : 'outline'}
            size="sm"
            className="cursor-pointer hover:bg-primary/90 hover:text-primary-foreground transition-colors"
            onClick={() => handleFilterChange('status', 'ALL')}
          >
            All Statuses
          </Badge>
          <Badge
            variant={initialStatus === 'OPEN' ? 'danger' : 'outline'}
            size="sm"
            className="cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors"
            onClick={() => handleFilterChange('status', 'OPEN')}
          >
            Open
          </Badge>
          <Badge
            variant={initialStatus === 'ACKNOWLEDGED' ? 'warning' : 'outline'}
            size="sm"
            className="cursor-pointer hover:bg-amber-100 hover:text-amber-800 transition-colors"
            onClick={() => handleFilterChange('status', 'ACKNOWLEDGED')}
          >
            Acknowledged
          </Badge>
          <Badge
            variant={initialStatus === 'RESOLVED' ? 'success' : 'outline'}
            size="sm"
            className="cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
            onClick={() => handleFilterChange('status', 'RESOLVED')}
          >
            Resolved
          </Badge>
        </div>

        {/* Dropdowns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Status</Label>
            <Select
              value={initialStatus || 'ALL'}
              onValueChange={(val) => handleFilterChange('status', val)}
            >
              <SelectTrigger className="h-9 bg-muted/30 focus:bg-background transition-colors text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Statuses" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="SNOOZED">Snoozed</SelectItem>
                <SelectItem value="SUPPRESSED">Suppressed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Urgency</Label>
            <Select
              value={initialUrgency || 'ALL'}
              onValueChange={(val) => handleFilterChange('urgency', val)}
            >
              <SelectTrigger className="h-9 bg-muted/30 focus:bg-background transition-colors text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Urgency" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Urgency</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Service</Label>
            <Select
              value={initialService || 'ALL'}
              onValueChange={(val) => handleFilterChange('service', val)}
            >
              <SelectTrigger className="h-9 bg-muted/30 focus:bg-background transition-colors text-sm">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Services" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Services</SelectItem>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Assignee</Label>
            <Select
              value={initialAssignee || 'ALL'}
              onValueChange={(val) => handleFilterChange('assignee', val)}
            >
              <SelectTrigger className="h-9 bg-muted/30 focus:bg-background transition-colors text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Assignees" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Assignees</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
