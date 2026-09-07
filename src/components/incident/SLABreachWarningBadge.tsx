'use client';

import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import type { IncidentSlaState } from '@/lib/incident-sla/state';

export type SLABreachWarningBadgeProps = { state: IncidentSlaState | null };

/** Warning policy is evaluated by the projector, never by a presentation component. */
export default function SLABreachWarningBadge({ state }: SLABreachWarningBadgeProps) {
  if (!state) return null;
  if (!state.valid)
    return (
      <Badge variant="danger" size="xs" title={state.reason}>
        SLA unavailable — invalid contract
      </Badge>
    );
  if (state.clock.paused)
    return (
      <Badge variant="outline" size="xs">
        SLA paused
      </Badge>
    );
  const phases = [
    { label: 'ACK', phase: state.ack },
    { label: 'RESOLVE', phase: state.resolve },
  ];
  return (
    <>
      {phases
        .filter(({ phase }) => phase.warning !== 'NONE')
        .map(({ label, phase }) => {
          const breached = phase.warning === 'BREACHED';
          const Icon = breached ? AlertCircle : AlertTriangle;
          return (
            <Badge
              key={label}
              variant={breached ? 'danger' : 'warning'}
              size="xs"
              className="gap-1.5"
              title={`SLA ${label} ${breached ? 'BREACHED' : 'warning'}`}
            >
              <Icon className="h-3 w-3" />
              <span>
                {breached
                  ? `${label} breached`
                  : `${Math.ceil(phase.remainingMs / 60000)}m to ${label}`}
              </span>
            </Badge>
          );
        })}
    </>
  );
}
