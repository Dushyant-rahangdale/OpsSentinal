'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/shadcn/badge';

type StatusBadgeProps = {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
};

function StatusBadge({ status, size = 'md', showDot = false, className }: StatusBadgeProps) {
  const sizeMap: Record<NonNullable<StatusBadgeProps['size']>, 'xs' | 'sm' | 'md'> = {
    sm: 'xs',
    md: 'sm',
    lg: 'md',
  };

  const statusVariantMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
    OPEN: 'danger',
    ACKNOWLEDGED: 'warning',
    RESOLVED: 'success',
    SNOOZED: 'neutral',
    SUPPRESSED: 'neutral',
    OPERATIONAL: 'success',
    DEGRADED: 'warning',
    CRITICAL: 'danger',
    // Postmortem statuses
    DRAFT: 'neutral',
    PUBLISHED: 'success',
    ARCHIVED: 'warning',
  };

  const variant = statusVariantMap[status] ?? 'info';
  const toneClass =
    variant === 'danger'
      ? 'bg-red-200 text-red-900 border-red-300 hover:bg-red-200'
      : variant === 'warning'
        ? 'bg-amber-200 text-amber-900 border-amber-300 hover:bg-amber-200'
        : variant === 'success'
          ? 'bg-emerald-200 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
          : variant === 'info'
            ? 'bg-blue-200 text-blue-900 border-blue-300 hover:bg-blue-200'
            : 'bg-slate-200 text-slate-900 border-slate-300 hover:bg-slate-200';
  const dotColor =
    variant === 'danger'
      ? 'bg-red-500'
      : variant === 'warning'
        ? 'bg-amber-500'
        : variant === 'success'
          ? 'bg-emerald-500'
          : variant === 'info'
            ? 'bg-blue-500'
            : 'bg-slate-400';

  return (
    <Badge variant={variant} size={sizeMap[size]} className={cn('uppercase', toneClass, className)}>
      {showDot && <span className={cn('h-2 w-2 rounded-full', dotColor)} />}
      {status}
    </Badge>
  );
}

// Memoize StatusBadge to prevent unnecessary re-renders
export default memo(StatusBadge);
