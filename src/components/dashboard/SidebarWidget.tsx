'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WidgetAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface SidebarWidgetProps {
  title: string;
  icon: ReactNode;
  iconBg: string;
  children: ReactNode;
  actions?: WidgetAction[];
  isLoading?: boolean;
  lastUpdated?: Date;
  onRefresh?: () => void;
}

/**
 * Widget Component - Modern Tailwind Design
 */
export default function SidebarWidget({
  title,
  icon,
  iconBg,
  children,
  actions,
  isLoading,
  lastUpdated,
  onRefresh,
}: SidebarWidgetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="shadow-lg border-border/50 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center shadow-sm"
              style={{ background: iconBg }}
            >
              {icon}
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
          </div>

          {/* Actions */}
          {(actions || onRefresh) && (
            <div className="flex gap-2 items-center">
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-neutral-100 hover:scale-105 transition-transform"
                  title="Refresh data"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              {actions?.map((action, idx) => (
                <Button
                  key={idx}
                  onClick={action.onClick}
                  size="sm"
                  variant={
                    action.variant === 'primary'
                      ? 'default'
                      : action.variant === 'danger'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="text-xs gap-1.5 shadow-xs hover:-translate-y-px transition-all"
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Last Updated Indicator - Client Only to prevent hydration mismatch */}
        {mounted && lastUpdated && (
          <Badge
            variant="secondary"
            className="w-fit mt-2 flex items-center gap-2 text-xs font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
            Updated {getTimeAgo(lastUpdated)}
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Formats a Date object as a human-readable relative time string
 * Handles edge cases: invalid dates, future dates, very old dates
 */
function getTimeAgo(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'unknown';
  }

  const now = Date.now();
  const then = date.getTime();
  const diffMs = now - then;

  // Handle future dates
  if (diffMs < 0) {
    return 'just now';
  }

  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // For older dates, show actual date
  return date.toLocaleDateString();
}

// Icon backgrounds - solid colors for reliability
export const WIDGET_ICON_BG = {
  green: '#059669', // Success green
  blue: '#3b82f6', // Info blue
  orange: '#f59e0b', // Warning orange
  purple: '#8b5cf6', // Purple
  red: '#f43f5e', // Error rose
  slate: '#475569', // Slate
  cyan: '#0891b2', // Cyan
};

// Icon colors - white shows on colored backgrounds
export const WIDGET_ICON_COLOR = {
  green: '#ffffff',
  blue: '#ffffff',
  orange: '#ffffff',
  purple: '#ffffff',
  red: '#ffffff',
  slate: '#ffffff',
  cyan: '#ffffff',
};
