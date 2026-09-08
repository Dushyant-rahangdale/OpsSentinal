'use client';

import type { IncidentSlaState } from '@/lib/incident-sla/state';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import SLAIndicator from '../SLAIndicator';

type IncidentSLABadgesProps = {
  sla: IncidentSlaState | null;
  className?: string;
};

export default function IncidentSLABadges({ sla, className }: IncidentSLABadgesProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 pt-1.5', className)}>
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-0.5">
        <Activity className="h-3 w-3" /> Response Health:
      </span>
      <SLAIndicator sla={sla} />
    </div>
  );
}
