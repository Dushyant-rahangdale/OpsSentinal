'use client';

import { memo } from 'react';
import { Badge } from '@/components/ui/shadcn/badge';
import { cn } from '@/lib/utils';
import { AlertCircle, ArrowUp, Zap } from 'lucide-react';

type PriorityBadgeProps = {
  priority: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
};

function PriorityBadge({ priority, size = 'md', showLabel = true, className }: PriorityBadgeProps) {
  if (!priority) return null;

  const config: Record<
    string,
    { label: string; variant: 'danger' | 'warning' | 'info' | 'neutral'; icon: any }
  > = {
    P1: {
      label: 'Crisis',
      variant: 'danger',
      icon: Zap,
    },
    P2: {
      label: 'High',
      variant: 'warning',
      icon: ArrowUp,
    },
    P3: {
      label: 'Medium',
      variant: 'warning',
      icon: AlertCircle,
    },
    P4: {
      label: 'Low',
      variant: 'info',
      icon: null,
    },
    P5: {
      label: 'Info',
      variant: 'neutral',
      icon: null,
    },
  };

  const { label, variant, icon: Icon } = config[priority] || {
    label: priority,
    variant: 'neutral',
    icon: null,
  };
  const toneClass =
    variant === 'danger'
      ? 'bg-red-200 text-red-900 border-red-300 hover:bg-red-200'
      : variant === 'warning'
        ? 'bg-amber-200 text-amber-900 border-amber-300 hover:bg-amber-200'
        : variant === 'info'
          ? 'bg-blue-200 text-blue-900 border-blue-300 hover:bg-blue-200'
          : 'bg-slate-200 text-slate-900 border-slate-300 hover:bg-slate-200';

  const badgeSize = size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm';
  const displayLabel =
    size === 'sm' && !showLabel ? priority : showLabel ? `${priority} - ${label}` : priority;

  return (
    <Badge
      variant={variant}
      size={badgeSize}
      className={cn(
        'font-bold shadow-sm flex items-center gap-1.5 shrink-0 transition-colors',
        toneClass,
        className
      )}
    >
      {Icon && <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      <span>{displayLabel}</span>
    </Badge>
  );
}

export default memo(PriorityBadge);
