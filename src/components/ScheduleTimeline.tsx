'use client';

import { useState, useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';
import { getDefaultAvatar } from '@/lib/avatar';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format, startOfDay, differenceInHours, isToday } from 'date-fns';

type TimelineShift = {
  id: string;
  userName: string;
  userAvatar?: string | null;
  userGender?: string | null;
  layerName: string;
  start: Date;
  end: Date;
  source?: 'layer' | 'rotation' | 'override';
};

type ScheduleTimelineProps = {
  shifts: TimelineShift[];
  timeZone: string;
};

const LAYER_COLORS = [
  {
    bg: 'from-indigo-500 to-indigo-600',
    light: 'bg-indigo-100',
    text: 'text-indigo-700',
    ring: 'ring-indigo-400',
  },
  {
    bg: 'from-emerald-500 to-emerald-600',
    light: 'bg-emerald-100',
    text: 'text-emerald-700',
    ring: 'ring-emerald-400',
  },
  {
    bg: 'from-amber-500 to-amber-600',
    light: 'bg-amber-100',
    text: 'text-amber-700',
    ring: 'ring-amber-400',
  },
  {
    bg: 'from-rose-500 to-rose-600',
    light: 'bg-rose-100',
    text: 'text-rose-700',
    ring: 'ring-rose-400',
  },
  {
    bg: 'from-sky-500 to-sky-600',
    light: 'bg-sky-100',
    text: 'text-sky-700',
    ring: 'ring-sky-400',
  },
  {
    bg: 'from-violet-500 to-violet-600',
    light: 'bg-violet-100',
    text: 'text-violet-700',
    ring: 'ring-violet-400',
  },
];

export default function ScheduleTimeline({ shifts, timeZone }: ScheduleTimelineProps) {
  const [daysToShow, setDaysToShow] = useState<7 | 14>(7);
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));

  const endDate = useMemo(() => addDays(startDate, daysToShow), [startDate, daysToShow]);

  // Generate day columns
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, daysToShow]);

  // Get unique layer names for color assignment
  const layerColorMap = useMemo(() => {
    const uniqueLayers = [...new Set(shifts.map(s => s.layerName))];
    const map = new Map<string, (typeof LAYER_COLORS)[0]>();
    uniqueLayers.forEach((layer, index) => {
      map.set(layer, LAYER_COLORS[index % LAYER_COLORS.length]);
    });
    return map;
  }, [shifts]);

  // Filter shifts to the visible range
  const visibleShifts = useMemo(() => {
    return shifts.filter(shift => shift.start < endDate && shift.end > startDate);
  }, [shifts, startDate, endDate]);

  // Group shifts by layer for row rendering
  const shiftsByLayer = useMemo(() => {
    const groups = new Map<string, TimelineShift[]>();
    visibleShifts.forEach(shift => {
      const existing = groups.get(shift.layerName) || [];
      existing.push(shift);
      groups.set(shift.layerName, existing);
    });
    return [...groups.entries()];
  }, [visibleShifts]);

  const handlePrevPeriod = () => {
    setStartDate(prev => addDays(prev, -daysToShow));
  };

  const handleNextPeriod = () => {
    setStartDate(prev => addDays(prev, daysToShow));
  };

  const handleToday = () => {
    setStartDate(startOfDay(new Date()));
  };

  const totalHours = daysToShow * 24;

  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Schedule Timeline</CardTitle>
              <CardDescription className="text-xs">
                {format(startDate, 'MMM d')} - {format(addDays(endDate, -1), 'MMM d, yyyy')}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="xs">
              {timeZone}
            </Badge>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <Button
                onClick={() => setDaysToShow(7)}
                size="sm"
                variant={daysToShow === 7 ? 'secondary' : 'ghost'}
                className="h-7 px-3 text-xs"
              >
                7 Days
              </Button>
              <Button
                onClick={() => setDaysToShow(14)}
                size="sm"
                variant={daysToShow === 14 ? 'secondary' : 'ghost'}
                className="h-7 px-3 text-xs"
              >
                14 Days
              </Button>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/70 p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={handlePrevPeriod}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs font-medium rounded-md"
                onClick={handleToday}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={handleNextPeriod}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Timeline Grid */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: daysToShow === 7 ? '700px' : '1000px' }}>
            {/* Day Headers */}
            <div className="flex sticky top-0 bg-white z-10 border-b border-slate-100">
              {days.map((day, index) => {
                const isCurrentDay = isToday(day);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex-1 py-3 px-2 text-center border-r border-slate-100 last:border-r-0 transition-colors',
                      isCurrentDay && 'bg-indigo-50/70',
                      isWeekend && !isCurrentDay && 'bg-slate-50/50'
                    )}
                  >
                    <div
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider mb-0.5',
                        isCurrentDay ? 'text-indigo-600' : 'text-slate-400'
                      )}
                    >
                      {format(day, 'EEE')}
                    </div>
                    <div
                      className={cn(
                        'text-lg font-bold',
                        isCurrentDay ? 'text-indigo-700' : 'text-slate-800'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                    <div
                      className={cn(
                        'text-[10px] font-medium',
                        isCurrentDay ? 'text-indigo-500' : 'text-slate-400'
                      )}
                    >
                      {format(day, 'MMM')}
                    </div>
                    {isCurrentDay && (
                      <div className="mt-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Layer Rows */}
            <div className="divide-y divide-slate-100">
              {shiftsByLayer.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <div className="text-center">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">No shifts scheduled</p>
                    <p className="text-xs mt-1">Shifts for this period will appear here</p>
                  </div>
                </div>
              ) : (
                shiftsByLayer.map(([layerName, layerShifts]) => {
                  const color = layerColorMap.get(layerName) || LAYER_COLORS[0];

                  return (
                    <div key={layerName} className="relative">
                      {/* Layer Label */}
                      <div className="absolute left-3 top-3 z-20">
                        <div
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm',
                            color.light,
                            color.text
                          )}
                        >
                          {layerName}
                        </div>
                      </div>

                      {/* Grid Background */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {days.map((day, index) => {
                          const isCurrentDay = isToday(day);
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          return (
                            <div
                              key={index}
                              className={cn(
                                'flex-1 border-r border-slate-100/50 last:border-r-0',
                                isCurrentDay && 'bg-indigo-50/20',
                                isWeekend && !isCurrentDay && 'bg-slate-50/30'
                              )}
                            />
                          );
                        })}
                      </div>

                      {/* Shift Blocks */}
                      <div className="relative px-3 pt-10 pb-4" style={{ minHeight: '100px' }}>
                        {layerShifts.map(shift => {
                          // Calculate position
                          const shiftStart = shift.start < startDate ? startDate : shift.start;
                          const shiftEnd = shift.end > endDate ? endDate : shift.end;

                          const startHours = differenceInHours(shiftStart, startDate);
                          const endHours = differenceInHours(shiftEnd, startDate);

                          const leftPercent = (startHours / totalHours) * 100;
                          const widthPercent = ((endHours - startHours) / totalHours) * 100;

                          const isOverride = shift.source === 'override';

                          return (
                            <TooltipProvider key={shift.id} delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      'absolute h-12 rounded-xl flex items-center gap-2 px-3 cursor-pointer transition-all duration-200',
                                      'bg-gradient-to-r shadow-md hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5',
                                      color.bg,
                                      isOverride && 'ring-2 ring-orange-400 ring-offset-2'
                                    )}
                                    style={{
                                      left: `${leftPercent}%`,
                                      width: `${Math.max(widthPercent, 3)}%`,
                                      top: '0',
                                    }}
                                  >
                                    <Avatar className="h-7 w-7 ring-2 ring-white/40 shadow-sm shrink-0">
                                      <AvatarImage
                                        src={
                                          shift.userAvatar ||
                                          getDefaultAvatar(shift.userGender, shift.userName)
                                        }
                                      />
                                      <AvatarFallback className="text-[10px] font-bold bg-white/30 text-white">
                                        {shift.userName.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    {widthPercent > 8 && (
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-white truncate">
                                          {shift.userName}
                                        </div>
                                        {widthPercent > 15 && (
                                          <div className="text-[10px] text-white/80 flex items-center gap-1 truncate">
                                            <Clock className="h-2.5 w-2.5" />
                                            {format(shift.start, 'HH:mm')} -{' '}
                                            {format(shift.end, 'HH:mm')}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {isOverride && (
                                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-white">!</span>
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-3 max-w-xs">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={
                                            shift.userAvatar ||
                                            getDefaultAvatar(shift.userGender, shift.userName)
                                          }
                                        />
                                        <AvatarFallback className="text-[9px]">
                                          {shift.userName.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-semibold text-slate-900">
                                        {shift.userName}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                      <Clock className="h-3 w-3" />
                                      {format(shift.start, 'MMM d, HH:mm')} -{' '}
                                      {format(shift.end, 'MMM d, HH:mm')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                          color.light,
                                          color.text
                                        )}
                                      >
                                        {shift.layerName}
                                      </span>
                                      {isOverride && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
                                          Override
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Legend */}
            {shiftsByLayer.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 p-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Layers:
                </span>
                {[...layerColorMap.entries()].map(([layer, color]) => (
                  <div key={layer} className="flex items-center gap-2">
                    <div
                      className={cn('h-3 w-3 rounded-md bg-gradient-to-r shadow-sm', color.bg)}
                    />
                    <span className="text-xs font-medium text-slate-600">{layer}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                  <div className="h-3 w-3 rounded-md bg-orange-500 ring-2 ring-orange-200" />
                  <span className="text-xs font-medium text-slate-600">Override</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
