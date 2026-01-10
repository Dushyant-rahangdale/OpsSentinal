'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/timezone';
import { getDefaultAvatar } from '@/lib/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Badge } from '@/components/ui/shadcn/badge';
import { Clock, Users, UserX, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CoverageBlock = {
  id: string;
  userName: string;
  userAvatar?: string | null;
  userGender?: string | null;
  layerName: string;
  start: Date | string; // Can be Date or ISO string from server
  end: Date | string; // Can be Date or ISO string from server
};

type CurrentCoverageDisplayProps = {
  initialBlocks: CoverageBlock[];
  scheduleTimeZone: string;
};

export default function CurrentCoverageDisplay({
  initialBlocks,
  scheduleTimeZone,
}: CurrentCoverageDisplayProps) {
  // Format date/time function using centralized utility
  const formatDateTimeLocal = (date: Date) => {
    // Ensure we're working with a proper Date object
    const dateObj = date instanceof Date ? date : new Date(date);

    return formatDateTime(dateObj, scheduleTimeZone, { format: 'short', hour12: true });
  };

  // Convert initialBlocks to ensure all dates are Date objects
  // Dates come as ISO strings from server, so we always convert them
  const normalizedBlocks = initialBlocks.map(block => ({
    ...block,
    start: new Date(block.start),
    end: new Date(block.end),
  }));

  const [activeBlocks, setActiveBlocks] = useState(normalizedBlocks);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Recalculate when initialBlocks prop changes (e.g., after layer update)
  useEffect(() => {
    const calculateActive = () => {
      const now = new Date();
      setCurrentTime(now);

      // Recalculate active blocks based on current time
      const nowTime = now.getTime();
      const normalized = initialBlocks.map(block => ({
        ...block,
        start: new Date(block.start),
        end: new Date(block.end),
      }));
      const active = normalized.filter(block => {
        const blockStartTime = block.start.getTime();
        const blockEndTime = block.end.getTime();
        return blockStartTime <= nowTime && blockEndTime > nowTime;
      });
      setActiveBlocks(active);
    };

    // Calculate immediately when initialBlocks changes
    calculateActive();
  }, [initialBlocks]);

  // Update current time every 30 seconds and recalculate active blocks
  useEffect(() => {
    const calculateActive = () => {
      const now = new Date();
      setCurrentTime(now);

      // Recalculate active blocks based on current time
      const nowTime = now.getTime();
      const normalized = initialBlocks.map(block => ({
        ...block,
        start: new Date(block.start),
        end: new Date(block.end),
      }));
      const active = normalized.filter(block => {
        const blockStartTime = block.start.getTime();
        const blockEndTime = block.end.getTime();
        return blockStartTime <= nowTime && blockEndTime > nowTime;
      });
      setActiveBlocks(active);
    };

    // Update every 30 seconds
    const interval = setInterval(calculateActive, 30000);

    return () => clearInterval(interval);
  }, [initialBlocks]);

  const nextChange = activeBlocks.length
    ? activeBlocks.reduce((earliest, block) => {
        const blockEndTime = new Date(block.end).getTime();
        const earliestTime = new Date(earliest).getTime();
        return blockEndTime < earliestTime ? block.end : earliest;
      }, activeBlocks[0].end)
    : null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasActiveCoverage = activeBlocks.length > 0;

  return (
    <Card
      className={cn(
        'mb-6 transition-all duration-300 border-2',
        hasActiveCoverage
          ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-300 shadow-lg shadow-emerald-100/50'
          : 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200 shadow-sm'
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              Current Coverage
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Updated: {formatDateTime(currentTime, scheduleTimeZone, { format: 'time' })}
            </p>
          </div>
          {hasActiveCoverage && (
            <Badge
              variant="success"
              size="sm"
              className="gap-1.5"
            >
              <Users className="h-3 w-3 mr-1" />
              {activeBlocks.length} {activeBlocks.length === 1 ? 'responder' : 'responders'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!hasActiveCoverage ? (
          <div className="rounded-lg bg-slate-100/80 border border-slate-200 p-8 text-center space-y-3">
            <div className="flex justify-center">
              <div className="rounded-full bg-slate-200 p-4">
                <UserX className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">No one is currently assigned.</p>
              <p className="text-xs text-slate-500 italic max-w-md mx-auto">
                Check layer start times and ensure layers have responders assigned.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Coverage Blocks */}
            <div className="space-y-3">
              {activeBlocks.map(block => (
                <div
                  key={block.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-slate-200 hover:shadow-md transition-all duration-200 hover:bg-white"
                >
                  {/* Avatar */}
                  <Avatar className="h-11 w-11 ring-2 ring-emerald-200 shadow-md shrink-0">
                    <AvatarImage
                      src={block.userAvatar || getDefaultAvatar(block.userGender, block.userName)}
                      alt={block.userName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-emerald-100 via-green-50 to-teal-50 text-emerald-700">
                      {getInitials(block.userName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-semibold text-sm text-slate-900 truncate">
                      {block.userName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      <Badge
                        variant="info"
                        size="xs"
                      >
                        {block.layerName}
                      </Badge>
                      <span className="text-slate-400">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Until {formatDateTimeLocal(block.end)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Next Change Indicator */}
            {nextChange && (
              <div className="rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-3 shadow-sm">
                <div className="flex items-center justify-center gap-2 text-sm text-amber-900 font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Next change: {formatDateTimeLocal(nextChange)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
