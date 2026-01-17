'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/shadcn/badge';
import { DirectUserAvatar } from '@/components/UserAvatar';
import { getDefaultAvatar } from '@/lib/avatar';
import { Clock, Users, CalendarClock, ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/timezone';

type QuickStatsProps = {
  layers: Array<{
    id: string;
    name: string;
    rotationLengthHours: number;
    users: Array<{
      userId: string;
      user: { name: string; avatarUrl?: string | null; gender?: string | null };
    }>;
  }>;
  activeBlocks: Array<{
    userName: string;
    userAvatar?: string | null;
    userGender?: string | null;
    layerName: string;
    end: Date;
  }>;
  overrideCount: number;
  timeZone: string;
};

export default function ScheduleQuickStats({
  layers,
  activeBlocks,
  overrideCount,
  timeZone,
}: QuickStatsProps) {
  const stats = useMemo(() => {
    // Total responders across all layers (unique)
    const allResponders = new Set<string>();
    layers.forEach(layer => {
      layer.users.forEach(u => allResponders.add(u.userId));
    });

    // Next handoff - earliest end time from active blocks
    let nextHandoff: {
      time: Date;
      from: string;
      fromAvatar: string;
      to: string;
      toAvatar: string;
      layer: string;
    } | null = null;
    if (activeBlocks.length > 0) {
      const sortedBlocks = [...activeBlocks].sort((a, b) => a.end.getTime() - b.end.getTime());
      const earliest = sortedBlocks[0];

      // Find who's next in that layer
      const layer = layers.find(l => l.name === earliest.layerName);
      let nextPerson = 'Next responder';
      let nextPersonAvatar = getDefaultAvatar(null, 'next');
      if (layer && layer.users.length > 1) {
        const currentIndex = layer.users.findIndex(u => u.user.name === earliest.userName);
        const nextIndex = (currentIndex + 1) % layer.users.length;
        const nextUser = layer.users[nextIndex];
        nextPerson = nextUser?.user.name || 'Next responder';
        nextPersonAvatar =
          nextUser?.user.avatarUrl || getDefaultAvatar(nextUser?.user.gender, nextUser?.userId);
      }

      nextHandoff = {
        time: earliest.end,
        from: earliest.userName,
        fromAvatar: earliest.userAvatar || getDefaultAvatar(earliest.userGender, earliest.userName),
        to: nextPerson,
        toAvatar: nextPersonAvatar,
        layer: earliest.layerName,
      };
    }

    return {
      totalLayers: layers.length,
      totalResponders: allResponders.size,
      activeOverrides: overrideCount,
      nextHandoff,
    };
  }, [layers, activeBlocks, overrideCount]);

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
            <Users className="h-3 w-3" />
          </div>
          <p className="text-lg font-bold text-slate-800">{stats.totalResponders}</p>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Responders</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
            <Zap className="h-3 w-3" />
          </div>
          <p className="text-lg font-bold text-slate-800">{stats.totalLayers}</p>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Layers</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
            <CalendarClock className="h-3 w-3" />
          </div>
          <p className="text-lg font-bold text-amber-600">{stats.activeOverrides}</p>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Overrides</p>
        </div>
      </div>

      {/* Next Handoff */}
      {stats.nextHandoff && (
        <div className="rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-white p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-2">
            <Clock className="h-3 w-3" />
            Next Handoff
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <DirectUserAvatar
                avatarUrl={stats.nextHandoff.fromAvatar}
                name={stats.nextHandoff.from}
                size="xs"
              />
              <span className="text-xs font-medium text-slate-700 truncate">
                {stats.nextHandoff.from}
              </span>
              <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
              <DirectUserAvatar
                avatarUrl={stats.nextHandoff.toAvatar}
                name={stats.nextHandoff.to}
                size="xs"
              />
              <span className="text-xs font-medium text-indigo-700 truncate">
                {stats.nextHandoff.to}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="h-5 text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200 shrink-0"
            >
              {formatHandoffTime(stats.nextHandoff.time)}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{stats.nextHandoff.layer}</p>
        </div>
      )}
    </div>
  );
}

function formatHandoffTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours < 0) return 'Now';
  if (diffHours === 0) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h ${diffMins}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}
