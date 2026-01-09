'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/shadcn/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  image?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Standardized EmptyState component for consistent empty states across the app
 *
 * @example
 * <EmptyState
 *   title="No incidents found"
 *   description="Create your first incident to get started"
 *   icon={<IncidentIcon />}
 *   action={{ label: "Create Incident", href: "/incidents/create" }}
 * />
 */
export default function EmptyState({
  title,
  description,
  icon,
  action,
  image,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'p-8 min-h-[200px]',
      icon: 'w-12 h-12 text-5xl',
      title: 'text-lg',
    },
    md: {
      container: 'p-12 min-h-[300px]',
      icon: 'w-16 h-16 text-6xl',
      title: 'text-xl',
    },
    lg: {
      container: 'p-16 min-h-[400px]',
      icon: 'w-20 h-20 text-7xl',
      title: 'text-2xl',
    },
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses[size].container,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {image && <div className="mb-6">{image}</div>}
      {icon && !image && (
        <div
          className={cn(
            'flex items-center justify-center mb-4 opacity-40 text-muted-foreground',
            sizeClasses[size].icon
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3
        className={cn(
          'font-semibold text-secondary-foreground',
          sizeClasses[size].title,
          description ? 'mb-2' : action ? 'mb-4' : 'mb-0'
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="text-base text-muted-foreground max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}
