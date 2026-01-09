import { Badge } from '@/components/ui/shadcn/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  count?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export default function StatusBadge({ status, count, variant = 'default' }: StatusBadgeProps) {
  // Auto-detect variant based on status
  let autoVariant = variant;
  if (variant === 'default') {
    if (status === 'RESOLVED') autoVariant = 'success';
    else if (status === 'OPEN') autoVariant = 'danger';
    else if (status === 'ACKNOWLEDGED') autoVariant = 'info';
    else if (status === 'SNOOZED' || status === 'SUPPRESSED') autoVariant = 'warning';
  }

  const variantStyles = {
    default: 'bg-neutral-100 border-neutral-200 text-neutral-800 hover:bg-neutral-200',
    success: 'bg-green-100 border-green-200 text-green-800 hover:bg-green-200',
    warning: 'bg-amber-100 border-amber-200 text-amber-800 hover:bg-amber-200',
    danger: 'bg-red-100 border-red-200 text-red-800 hover:bg-red-200',
    info: 'bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-200',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 transition-colors',
        variantStyles[autoVariant]
      )}
    >
      {status}
      {count !== undefined && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/50 text-[0.65rem] font-bold">
          {count}
        </span>
      )}
    </Badge>
  );
}
