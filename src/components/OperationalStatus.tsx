'use client';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/shadcn/hover-card';
import {
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOperationalStats } from '@/hooks/useOperationalStats';

type Props = {
  // Optional props for fallback or override
  tone?: 'ok' | 'danger' | 'warning';
  label?: string;
  detail?: string;
  criticalCount?: number;
  mediumCount?: number;
  lowCount?: number;
};

export default function OperationalStatus({
  tone: initialTone,
  label: initialLabel,
  detail: initialDetail,
  criticalCount: criticalCountOverride,
  mediumCount = 0,
  lowCount = 0,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const {
    activeCount,
    criticalCount,
    mediumCount: mediumCountLive,
    lowCount: lowCountLive,
    loading,
  } = useOperationalStats();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const hasOverrides =
    typeof criticalCountOverride === 'number' ||
    typeof mediumCount === 'number' ||
    typeof lowCount === 'number';

  const critical =
    typeof criticalCountOverride === 'number' ? criticalCountOverride : criticalCount;
  const medium = hasOverrides ? mediumCount : mediumCountLive;
  const low = hasOverrides ? lowCount : lowCountLive;
  const active = hasOverrides ? critical + medium + low : activeCount;

  // Determine state from backend data
  const nonCriticalCount = Math.max(0, active - critical);

  // Logic:
  // - Danger: Critical count > 0
  // - Warning: Low urgency count > 0
  // - OK: Active count == 0

  const isDanger = critical > 0;
  // Warning if explicitly passed mediumCount > 0 OR if falling back to old logic
  const isWarning = !isDanger && (medium > 0 || nonCriticalCount > 0);
  const isOk = !isDanger && !isWarning;

  // Derived Label/Detail
  const label =
    initialLabel || (isDanger ? 'Critical Alert' : isWarning ? 'Yellow Alert' : 'Green Corridor');

  const detail =
    initialDetail ||
    (isDanger
      ? `${critical} critical incidents active`
      : isWarning
        ? `${medium} warning signs detected`
        : 'Systems Normal');

  interface ThemeConfig {
    bg: string;
    border: string;
    text: string;
    hoverBorder: string;
    hoverBg: string;
    hoverShadow: string;
    dot: string;
    dotBg: string;
    gradient: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    lightBorder: string;
  }

  // Dynamic Theme Configuration
  const theme: Record<'danger' | 'warning' | 'ok', ThemeConfig> = {
    danger: {
      bg: 'bg-red-50/50',
      border: 'border-red-200/60',
      text: 'text-red-700',
      hoverBorder: 'hover:border-red-300',
      hoverBg: 'hover:bg-red-100/50',
      hoverShadow: 'hover:shadow-[0_0_25px_-5px_rgba(239,68,68,0.5)]',
      dot: 'bg-red-500',
      dotBg: 'bg-red-600',
      gradient: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700',
      icon: <AlertTriangle className="h-5 w-5 text-red-100 fill-white/20" />,
      title: 'Critical Alert',
      desc: 'Critical incidents detected. Immediate resolution required.',
      lightBorder: 'border-red-100/50',
    },
    warning: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200/60',
      text: 'text-amber-700',
      hoverBorder: 'hover:border-amber-300',
      hoverBg: 'hover:bg-amber-100/50',
      hoverShadow: 'hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.5)]',
      dot: 'bg-amber-500',
      dotBg: 'bg-amber-600',
      gradient: 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600',
      icon: <AlertCircle className="h-5 w-5 text-amber-100 fill-white/20" />,
      title: 'Yellow Alert',
      desc: 'Non-critical issues reported. Monitoring medium and low urgency alerts.',
      lightBorder: 'border-amber-100/50',
    },
    ok: {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-200/60',
      text: 'text-emerald-700',
      hoverBorder: 'hover:border-emerald-300',
      hoverBg: 'hover:bg-emerald-100/50',
      hoverShadow: 'hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.5)]',
      dot: 'bg-emerald-500',
      dotBg: 'bg-emerald-600',
      gradient: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-100 fill-white/20" />,
      title: 'Green Corridor',
      desc: 'All systems fully operational. No active anomalies.',
      lightBorder: 'border-emerald-100/50',
    },
  };

  const currentTheme = initialTone
    ? theme[initialTone]
    : isDanger
      ? theme.danger
      : isWarning
        ? theme.warning
        : theme.ok;

  if (loading && !initialTone && !hasOverrides) {
    // Show loading only if no fallback
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/20 animate-pulse">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        <span className="text-[10px] uppercase font-bold text-muted-foreground">Checking...</span>
      </div>
    );
  }

  return (
    <HoverCard openDelay={0} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          className={cn(
            'group relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-full transition-all duration-300 ease-out select-none overflow-hidden',
            'backdrop-blur-md border',
            currentTheme.bg,
            currentTheme.border,
            currentTheme.text,
            currentTheme.hoverBorder,
            currentTheme.hoverBg,
            currentTheme.hoverShadow
          )}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent z-10 pointer-events-none" />

          {/* Radar Pulse Animation */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-60',
                currentTheme.dot
              )}
            />
            <span
              className={cn(
                'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full opacity-30 animation-delay-500',
                currentTheme.dot
              )}
            />
            <span
              className={cn(
                'relative inline-flex rounded-full h-2.5 w-2.5 shadow-sm',
                currentTheme.dotBg
              )}
            />
          </span>

          <span className="text-[11px] font-bold tracking-wider uppercase z-20">{label}</span>

          {/* Subtle Sparkle */}
          <Sparkles
            className={cn(
              'w-3 h-3 opacity-0 -ml-2 transition-all duration-300 group-hover:opacity-100 group-hover:ml-0 group-hover:rotate-12',
              currentTheme.text
            )}
          />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        sideOffset={10}
        align="start"
        className={cn(
          'w-80 p-0 border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 z-[1050]',
          currentTheme.lightBorder
        )}
      >
        {/* Immersive Header */}
        <div
          className={cn(
            'relative h-24 w-full flex flex-col justify-end p-5',
            currentTheme.gradient,
            'text-white'
          )}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent opacity-50" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentTheme.icon}
              <h4 className="font-bold text-lg tracking-tight">{currentTheme.title}</h4>
            </div>
            <div
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 border border-white/30 backdrop-blur-sm shadow-sm'
              )}
            >
              Live
            </div>
          </div>
        </div>

        <div className="p-5 bg-white/95 backdrop-blur-xl">
          <p className="text-xs text-muted-foreground font-medium mb-4 leading-relaxed">
            {currentTheme.desc}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div
              className={cn(
                'flex flex-col gap-1 p-2.5 rounded-lg border bg-opacity-50',
                isOk
                  ? 'bg-emerald-50 border-emerald-100'
                  : isWarning
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-red-50 border-red-100'
              )}
            >
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                Critical
              </span>
              <span className="text-[10px] text-muted-foreground">High urgency</span>
              <span
                className={cn(
                  'text-xl font-bold',
                  isOk ? 'text-emerald-600' : isWarning ? 'text-amber-600' : 'text-red-600'
                )}
              >
                {critical}
              </span>
            </div>

            {/* Medium Priority Card */}
            <div
              className={cn(
                'flex flex-col gap-1 p-2.5 rounded-lg border bg-opacity-50',
                mediumCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-muted/30 border-muted'
              )}
            >
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                Warning
              </span>
              <span className="text-[10px] text-muted-foreground">Medium urgency</span>
              <span
                className={cn(
                  'text-xl font-bold',
                  mediumCount > 0 ? 'text-amber-600' : 'text-muted-foreground'
                )}
              >
                {medium}
              </span>
            </div>

            {/* Low/Non-Critical Card (Full Width) */}
            <div
              className={cn(
                'col-span-2 flex items-center justify-between p-2.5 rounded-lg border bg-opacity-50',
                'bg-muted/30 border-muted'
              )}
            >
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                  Low Priority
                </span>
                <div className="text-[10px] text-muted-foreground">Low urgency</div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn('text-xl font-bold', 'text-foreground')}>{low}</span>
                <span className="text-[10px] text-muted-foreground bg-muted p-1 px-1.5 rounded">
                  Logs
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <Link
            href="/incidents"
            className="group/btn flex items-center justify-between w-full p-2 pl-3 rounded-md bg-muted/40 hover:bg-muted/70 transition-all border border-transparent hover:border-border"
          >
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{detail}</span>
            </div>
            <div className="flex items-center justify-center h-6 w-6 rounded bg-background shadow-sm border group-hover/btn:scale-110 transition-transform">
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
