'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href: string;
}

interface SettingsPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

export function SettingsPageHeader({
  title,
  description,
  backHref,
  backLabel = 'Back to Settings',
  actions,
  breadcrumbs,
  className,
}: SettingsPageHeaderProps) {
  return (
    <header className={cn('relative space-y-4 pb-6 border-b border-border', className)}>
      {/* Back Link */}
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{backLabel}</span>
        </Link>
      )}

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight size={14} className="text-muted-foreground" />}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title and Description */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tighter">{title}</h1>
          {description && (
            <p className="text-base text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
