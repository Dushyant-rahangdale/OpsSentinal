'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Badge } from '@/components/ui/shadcn/badge';
import PriorityBadge from './PriorityBadge';
import { updateIncidentPriority } from '@/app/(app)/incidents/actions';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type PrioritySelectorProps = {
  incidentId: string;
  priority: string | null;
  canManage: boolean;
};

export default function PrioritySelector({
  incidentId,
  priority,
  canManage,
}: PrioritySelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Read-only view
  if (!canManage) {
    return priority ? (
      <PriorityBadge priority={priority} size="md" />
    ) : (
      <Badge variant="neutral" size="sm" className="border-dashed bg-transparent">
        Unassigned
      </Badge>
    );
  }

  return (
    <Select
      value={priority || 'unassigned'}
      onValueChange={val => {
        startTransition(async () => {
          await updateIncidentPriority(incidentId, val === 'unassigned' ? null : val);
          router.refresh();
        });
      }}
      disabled={isPending}
    >
      <SelectTrigger
        className={cn(
          'h-auto w-auto min-w-[100px] border-0 bg-transparent p-0 shadow-none focus:ring-0 hover:opacity-100 transition-all [&>svg]:hidden group'
        )}
      >
        <SelectValue placeholder="Priority">
          {priority ? (
            <div className="flex items-center gap-1.5 cursor-pointer py-1">
              <PriorityBadge
                priority={priority}
                size="md"
                className="shadow-sm ring-1 ring-slate-900/5"
              />
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors opacity-50 group-hover:opacity-100" />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-slate-500 border-2 border-dashed border-slate-300 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer shadow-sm">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-bold uppercase tracking-wide">Set Priority</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[160px]">
        <SelectItem value="unassigned" className="text-muted-foreground text-xs py-2">
          Unassigned
        </SelectItem>
        <div className="h-px bg-slate-100 my-1" />
        <SelectItem value="P1">
          <PriorityBadge priority="P1" size="sm" showLabel />
        </SelectItem>
        <SelectItem value="P2">
          <PriorityBadge priority="P2" size="sm" showLabel />
        </SelectItem>
        <SelectItem value="P3">
          <PriorityBadge priority="P3" size="sm" showLabel />
        </SelectItem>
        <SelectItem value="P4">
          <PriorityBadge priority="P4" size="sm" showLabel />
        </SelectItem>
        <SelectItem value="P5">
          <PriorityBadge priority="P5" size="sm" showLabel />
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
