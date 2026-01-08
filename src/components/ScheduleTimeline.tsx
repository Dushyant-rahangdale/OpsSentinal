'use client';

import { useMemo, useState } from 'react';
import { formatDateTime } from '@/lib/timezone';
import { getDefaultAvatar } from '@/lib/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Calendar, Clock, Layers, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimelineShift = {
  id: string;
  start: string;
  end: string;
  label: string;
  layerName: string;
  userName: string;
  userAvatar?: string | null;
  userGender?: string | null;
  source?: string;
};

type ScheduleTimelineProps = {
  shifts: TimelineShift[];
  timeZone: string;
  layers: Array<{ id: string; name: string }>;
};

export default function ScheduleTimeline({ shifts, timeZone, layers }: ScheduleTimelineProps) {
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: 0, end: 6 }); // Next 7 days

  const filteredShifts = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + dateRange.start);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setDate(now.getDate() + dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    // First, filter by date range and layer
    const inRangeShifts = shifts
      .map(shift => ({
        ...shift,
        startDate: new Date(shift.start),
        endDate: new Date(shift.end),
      }))
      .filter(shift => {
        const inRange = shift.startDate < endDate && shift.endDate > startDate;
        const layerMatch = !selectedLayer || shift.layerName === selectedLayer;
        return inRange && layerMatch;
      });

    // Group by layer and date to show only one shift per layer per day
    const byLayerAndDay = new Map<string, TimelineShift & { startDate: Date; endDate: Date }>();

    inRangeShifts.forEach(shift => {
      // Create a key based on layer name and the day the shift starts
      const shiftStartDay = new Date(shift.startDate);
      shiftStartDay.setHours(0, 0, 0, 0);
      const dayKey = `${shift.layerName}-${shiftStartDay.toISOString().split('T')[0]}`;

      if (!byLayerAndDay.has(dayKey)) {
        byLayerAndDay.set(dayKey, shift);
      } else {
        const existing = byLayerAndDay.get(dayKey)!;
        // Prefer the shift that starts on this day (not a continuation from previous day)
        const shiftStartsOnDay =
          shift.startDate.getDate() === shiftStartDay.getDate() &&
          shift.startDate.getMonth() === shiftStartDay.getMonth() &&
          shift.startDate.getFullYear() === shiftStartDay.getFullYear();
        const existingStartsOnDay =
          existing.startDate.getDate() === shiftStartDay.getDate() &&
          existing.startDate.getMonth() === shiftStartDay.getMonth() &&
          existing.startDate.getFullYear() === shiftStartDay.getFullYear();

        if (shiftStartsOnDay && !existingStartsOnDay) {
          byLayerAndDay.set(dayKey, shift);
        } else if (shiftStartsOnDay && existingStartsOnDay) {
          // Both start on this day, prefer the one that starts earlier
          if (shift.startDate < existing.startDate) {
            byLayerAndDay.set(dayKey, shift);
          }
        }
      }
    });

    return Array.from(byLayerAndDay.values()).sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );
  }, [shifts, selectedLayer, dateRange]);

  const timelineStart = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() + dateRange.start);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [dateRange.start]);

  const timelineEnd = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + dateRange.end);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [dateRange.end]);

  const getShiftPosition = (shift: (typeof filteredShifts)[0]) => {
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    const shiftStartMs = shift.startDate.getTime() - timelineStart.getTime();
    const shiftDurationMs = shift.endDate.getTime() - shift.startDate.getTime();

    const left = Math.max(0, (shiftStartMs / totalMs) * 100);
    const width = Math.min(100, (shiftDurationMs / totalMs) * 100);

    return { left: `${left}%`, width: `${width}%` };
  };

  const layerColors = useMemo(() => {
    const colors = [
      {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        text: 'text-sky-900',
        badge: 'bg-sky-100',
        bar: 'bg-sky-300',
      },
      {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-900',
        badge: 'bg-amber-100',
        bar: 'bg-amber-300',
      },
      {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-900',
        badge: 'bg-purple-100',
        bar: 'bg-purple-300',
      },
      {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-900',
        badge: 'bg-emerald-100',
        bar: 'bg-emerald-300',
      },
      {
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-900',
        badge: 'bg-rose-100',
        bar: 'bg-rose-300',
      },
    ];

    const map = new Map<string, (typeof colors)[0]>();
    layers.forEach((layer, index) => {
      map.set(layer.name, colors[index % colors.length]);
    });
    return map;
  }, [layers]);

  const defaultLayerColor = {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-900',
    badge: 'bg-sky-100',
    bar: 'bg-sky-300',
  };

  const formatTime = (date: Date) => {
    return formatDateTime(date, timeZone, { format: 'time', hour12: true });
  };

  const formatDate = (date: Date) => {
    return (
      formatDateTime(date, timeZone, { format: 'short' }).split(',')[0] ||
      formatDateTime(date, timeZone, { format: 'date' })
    );
  };

  return (
    <Card className="mb-8 shadow-lg border-slate-200">
      <CardHeader className="pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-foreground">Timeline View</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Visual schedule showing all shifts over time
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Layer Filter */}
            <Select
              value={selectedLayer || 'all'}
              onValueChange={value => setSelectedLayer(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-[160px] h-9">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Layers" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Layers</SelectItem>
                {layers.map(layer => (
                  <SelectItem key={layer.id} value={layer.name}>
                    {layer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Buttons */}
            <div className="flex gap-1">
              <Button
                type="button"
                variant={dateRange.end === 6 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange({ start: 0, end: 6 })}
                className="h-9"
              >
                7 Days
              </Button>
              <Button
                type="button"
                variant={dateRange.end === 13 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange({ start: 0, end: 13 })}
                className="h-9"
              >
                14 Days
              </Button>
              <Button
                type="button"
                variant={dateRange.end === 29 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange({ start: 0, end: 29 })}
                className="h-9"
              >
                30 Days
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {filteredShifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/30 rounded-lg border-2 border-dashed">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground text-center">
              No shifts found for the selected period.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDate(timelineStart)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>{formatDate(timelineEnd)}</span>
                <Clock className="h-4 w-4" />
              </div>
            </div>

            {/* Timeline Ruler */}
            <div className="relative h-0.5 bg-slate-200 mb-8">
              {Array.from({ length: 8 }).map((_, i) => {
                const date = new Date(timelineStart);
                date.setDate(timelineStart.getDate() + (i * (dateRange.end - dateRange.start)) / 7);
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-slate-400"
                    style={{ left: `${(i / 7) * 100}%` }}
                  />
                );
              })}
            </div>

            {/* Shifts */}
            <div className="space-y-3">
              {filteredShifts.map(shift => {
                const position = getShiftPosition(shift);
                const colors =
                  layerColors.get(shift.layerName) ||
                  layerColors.values().next().value ||
                  defaultLayerColor;
                const isMultiDay = shift.startDate.toDateString() !== shift.endDate.toDateString();

                return (
                  <div
                    key={shift.id}
                    className={cn(
                      'relative p-4 rounded-lg border-2 min-h-[76px] transition-all hover:shadow-md',
                      colors.bg,
                      colors.border
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* Left side: Layer, User, Override */}
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs font-semibold shrink-0',
                            colors.badge,
                            colors.text
                          )}
                        >
                          {shift.layerName}
                        </Badge>

                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5 border border-white/50">
                            <AvatarImage
                              src={
                                shift.userAvatar ||
                                getDefaultAvatar(shift.userGender, shift.userName)
                              }
                              alt={shift.userName}
                            />
                            <AvatarFallback className="text-xs">
                              {shift.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn('font-semibold text-sm truncate', colors.text)}>
                            {shift.userName}
                          </span>
                        </div>

                        {shift.source === 'override' && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-amber-50 text-amber-800 border-amber-200"
                          >
                            Override
                          </Badge>
                        )}
                      </div>

                      {/* Right side: Time */}
                      <div className={cn('text-xs shrink-0', colors.text)}>
                        <div className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatTime(shift.startDate)} - {formatTime(shift.endDate)}
                          </span>
                        </div>
                        {isMultiDay && (
                          <div className="text-[0.7rem] opacity-75 mt-1 text-right">
                            {formatDate(shift.startDate)} - {formatDate(shift.endDate)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div
                      className={cn('absolute bottom-0 left-0 h-1 rounded-b-md', colors.bar)}
                      style={{
                        left: position.left,
                        width: position.width,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
