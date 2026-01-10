'use client';

import { memo } from 'react';
import { Badge } from '@/components/ui/shadcn/badge';
import { cn } from '@/lib/utils';

type EscalationStatusBadgeProps = {
  status: string | null | undefined;
  currentStep: number | null | undefined;
  nextEscalationAt: Date | null | undefined;
  size?: 'sm' | 'md';
};

function EscalationStatusBadge({
  status,
  currentStep,
  nextEscalationAt,
  size = 'md',
}: EscalationStatusBadgeProps) {
  if (!status || status === 'COMPLETED') {
    return null;
  }

  const badgeSize = size === 'sm' ? 'xs' : 'sm';
  const variant = status === 'ESCALATING' ? 'warning' : 'neutral';

  const getTimeUntilNext = () => {
    if (!nextEscalationAt) return null;
    const now = new Date();
    const nextDate =
      nextEscalationAt instanceof Date ? nextEscalationAt : new Date(nextEscalationAt);
    const diff = nextDate.getTime() - now.getTime();
    if (diff < 0) return 'Due now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  };

  const timeText = getTimeUntilNext();
  const compact = size === 'sm';
  const stepText =
    currentStep !== null && currentStep !== undefined ? `Step ${currentStep + 1}` : null;
  const titleParts = [
    status === 'ESCALATING' ? 'Escalating' : 'Escalation',
    stepText,
    timeText ? `Next: ${timeText}` : null,
  ].filter(Boolean);
  const labelParts = [
    status === 'ESCALATING' ? 'Escalating' : 'Escalation',
    !compact ? stepText : null,
    !compact && timeText ? timeText : null,
  ].filter(Boolean);

  return (
    <Badge
      variant={variant}
      size={badgeSize}
      className="gap-1.5"
      title={titleParts.join(' - ')}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full ring-2 ring-offset-0',
          status === 'ESCALATING'
            ? 'bg-amber-500 ring-amber-200/70 animate-pulse'
            : 'bg-slate-400 ring-slate-200/70'
        )}
      />
      <span>{labelParts.join(' - ')}</span>
    </Badge>
  );
}

// Memoize EscalationStatusBadge to prevent unnecessary re-renders
export default memo(EscalationStatusBadge);
