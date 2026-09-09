'use client';

import type { IncidentSlaState } from '@/lib/incident-sla/state';
import { formatTimeMinutesMs } from '@/lib/time-format';
import { Badge } from '@/components/ui/shadcn/badge';
import { CheckCircle2, AlertCircle, Timer, Pause } from 'lucide-react';

type SLAIndicatorProps = { sla: IncidentSlaState | null; showDetails?: boolean };
type Phase = Extract<IncidentSlaState, { valid: true }>['ack'];

function phaseLabel(phase: Phase): string {
  switch (phase.status) {
    case 'MET':
      return 'Met';
    case 'BREACHED':
      return 'Breached';
    case 'NOT_REQUIRED':
      return 'Not required';
    default:
      return `${formatTimeMinutesMs(phase.remainingMs)} left`;
  }
}

/** Presentation only; decisions and measurements belong to the shared projector. */
export default function SLAIndicator({ sla, showDetails = false }: SLAIndicatorProps) {
  if (!sla) return <span className="text-xs text-muted-foreground">Loading SLA…</span>;
  if (!sla.valid)
    return (
      <Badge variant="danger" size="xs" title={sla.reason}>
        SLA unavailable — invalid contract
      </Badge>
    );
  const phases = [
    { name: showDetails ? 'Acknowledgement' : 'Ack', phase: sla.ack },
    { name: showDetails ? 'Resolution' : 'Resolve', phase: sla.resolve },
  ];
  return (
    <div className={showDetails ? 'space-y-4' : 'flex gap-2 flex-wrap'}>
      {sla.clock.paused && (
        <Badge variant="warning" size="xs" className="gap-1">
          <Pause className="h-3 w-3" /> SLA paused
        </Badge>
      )}
      {phases.map(({ name, phase }) => {
        const breached = phase.status === 'BREACHED';
        const met = phase.status === 'MET';
        const notRequired = phase.status === 'NOT_REQUIRED';
        const Icon = met ? CheckCircle2 : breached ? AlertCircle : Timer;
        const measurement = notRequired
          ? 'Not required for this incident'
          : `Time: ${formatTimeMinutesMs(phase.elapsedMs)} / Target: ${formatTimeMinutesMs(phase.targetMs)}`;
        return (
          <div
            key={name}
            className={showDetails ? 'p-4 bg-muted/50 rounded-lg border' : 'space-y-1'}
          >
            <Badge
              variant={met ? 'success' : breached ? 'danger' : 'outline'}
              size="xs"
              className="gap-1"
              title={measurement}
            >
              <Icon className="h-3 w-3" />
              {name} {phaseLabel(phase)}
            </Badge>
            {showDetails && !notRequired && (
              <div
                className="h-2 mt-3 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-label={`${name} SLA progress`}
                aria-valuenow={Math.round(phase.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full transition-all ${met ? 'bg-emerald-500' : breached ? 'bg-rose-500' : 'bg-primary'}`}
                  style={{ width: `${phase.progress * 100}%` }}
                />
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">{measurement}</div>
          </div>
        );
      })}
      {showDetails && (
        <p className="text-xs text-muted-foreground">
          Contract: {sla.contract.priorityAtCapture ?? 'Fallback'} · policy v
          {sla.contract.policyVersion ?? 'legacy'} · {sla.contract.policyRule ?? 'base'}
        </p>
      )}
    </div>
  );
}
