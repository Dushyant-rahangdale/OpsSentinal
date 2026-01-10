import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-4 tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-red-900/60 dark:text-red-100 dark:hover:bg-red-900/80',
        outline: 'border-border text-foreground bg-transparent',
        neutral: 'border-border bg-muted text-foreground dark:bg-slate-900 dark:text-slate-100',
        info: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/45 dark:bg-blue-500/25 dark:text-blue-100',
        success:
          'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/45 dark:bg-emerald-500/25 dark:text-emerald-100',
        warning:
          'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/45 dark:bg-amber-500/25 dark:text-amber-100',
        danger: 'border-red-200 bg-red-100 text-red-800 dark:border-red-500/45 dark:bg-red-500/25 dark:text-red-100',
      },
      size: {
        xs: 'px-2 py-0.5 text-[10px]',
        sm: 'px-2.5 py-0.5 text-[11px]',
        md: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      data-badge="true"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
