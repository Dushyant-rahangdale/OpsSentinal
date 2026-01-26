'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';

interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

interface IncidentHeatmapWidgetProps {
  data?: HeatmapDataPoint[];
  rangeLabel?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
}

export function IncidentHeatmapWidget({
  data,
  rangeLabel,
  startDate,
  endDate,
  days = 365,
}: IncidentHeatmapWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Responsive resize handler
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.getBoundingClientRect().width);
    }
  }, []);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [handleResize]);

  // Calculate number of weeks first (needed for cell size calculation)
  const weeksCount = useMemo(() => {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const curr = new Date(start);
    curr.setDate(curr.getDate() - curr.getDay());
    const totalDays = Math.ceil((end.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Math.ceil(totalDays / 7);
  }, [startDate, endDate, days]);

  // Responsive cell sizing - dynamically calculate to fill available width
  const { cellSize, cellGap, showDayLabels, fontSize } = useMemo(() => {
    const dayLabelWidth = 24; // Width for day labels column
    // Critical fix: Padding must account for the largest possible padding (md:p-6 = 24px * 2 = 48px) + borders
    const padding = 52;
    const availableWidth = Math.max(0, containerWidth - dayLabelWidth - padding);

    // Calculate optimal cell size to fill width
    // availableWidth = weeks * cellSize + (weeks - 1) * gap
    // Using gap = cellSize * 0.25
    const gapRatio = 0.25;
    const effectiveWeeks = weeksCount + (weeksCount - 1) * gapRatio;

    // Calculate precise cell size needed to fit
    // availableWidth = weeks * (cell + gap)
    // We want to force it to fit, so we calculate the max width per week
    const widthPerWeek = effectiveWeeks > 0 ? (availableWidth / effectiveWeeks) : 12;

    // Determine safe gap based on available space
    // If very tight (<12px per week), use 1px gap. Otherwise 2px.
    const safeGap = widthPerWeek < 12 ? 1 : 2;

    // Cell size is the remainder. Ensure at least 2px.
    const scaledCell = Math.max(2, Math.min(40, Math.floor(widthPerWeek - safeGap)));

    // Recalculate actual gap used (in case floor changed things)
    const scaledGap = safeGap;

    // Only show day labels if cells are big enough to matter
    const showDayLabels = scaledCell >= 10;
    const fontSize = Math.max(8, Math.min(11, scaledCell * 0.8));

    return {
      cellSize: scaledCell,
      cellGap: scaledGap,
      showDayLabels,
      fontSize,
    };
  }, [containerWidth, weeksCount]);

  const { weeks, monthLabels, totalCount, maxCount } = useMemo(() => {
    const rawData = data || [];
    const dataMap = new Map<string, number>();
    let total = 0;
    let max = 0;
    rawData.forEach(point => {
      const current = (dataMap.get(point.date) || 0) + point.count;
      dataMap.set(point.date, current);
      total += point.count;
      max = Math.max(max, current);
    });

    // Determine range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    // Normalize to midnight
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Generate all days
    const allDays: { date: Date; dateStr: string; count: number }[] = [];
    const curr = new Date(start);

    // Align start to the previous Sunday
    const dayOfWeek = curr.getDay();
    curr.setDate(curr.getDate() - dayOfWeek);

    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      allDays.push({
        date: new Date(curr),
        dateStr,
        count: dataMap.get(dateStr) || 0,
      });
      curr.setDate(curr.getDate() + 1);
    }

    // Chunk into weeks
    const weeksArray: { days: typeof allDays }[] = [];
    let currentMonth: string | null = null;
    const monthLabelsArray: { label: string; weekIndex: number }[] = [];

    for (let i = 0; i < allDays.length; i += 7) {
      const weekDays = allDays.slice(i, i + 7);
      weeksArray.push({ days: weekDays });

      const firstDay = weekDays[0].date;
      const MONTHS = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const monthName = MONTHS[firstDay.getMonth()];

      if (monthName !== currentMonth) {
        monthLabelsArray.push({ label: monthName, weekIndex: weeksArray.length - 1 });
        currentMonth = monthName;
      }
    }

    // Filter out overlapping labels (prioritize the specific month start over partial chart edges)
    const filteredMonthLabels = monthLabelsArray.filter((label, index) => {
      if (index < monthLabelsArray.length - 1) {
        const nextLabel = monthLabelsArray[index + 1];
        // If current label is less than 3 weeks from the next one, hide it (it's likely a partial month at start)
        if (nextLabel.weekIndex - label.weekIndex < 3) {
          return false;
        }
      }
      return true;
    });

    return {
      weeks: weeksArray,
      monthLabels: filteredMonthLabels,
      totalCount: total,
      maxCount: max || 1,
    };
  }, [data, startDate, endDate, days]);

  // Improved color scale - matches HeatmapCalendar for consistency
  const getColor = useCallback(
    (count: number) => {
      if (count === 0) return 'bg-slate-100 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/50';

      // Use a minimum scale of 4 to prevent low counts (1-2) from showing as High intensity
      // when the total volume is low.
      const scaleMax = Math.max(maxCount, 4);
      const intensity = count / scaleMax;

      if (intensity <= 0.25) return 'bg-green-200 dark:bg-green-900/50 border-green-300 dark:border-green-800';
      if (intensity <= 0.5) return 'bg-yellow-200 dark:bg-yellow-900/50 border-yellow-300 dark:border-yellow-800';
      if (intensity <= 0.75) return 'bg-orange-300 dark:bg-orange-900/50 border-orange-400 dark:border-orange-800';
      return 'bg-red-400 dark:bg-red-900/50 border-red-500 dark:border-red-800';
    },
    [maxCount]
  );

  // Calculate the position multiplier for month labels
  const weekWidth = cellSize + cellGap;

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className="group relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 dark:from-primary/5 dark:via-slate-950 dark:to-primary/5 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-5 md:p-6 overflow-hidden"
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />

        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-primary/10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                Incident Activity
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">
                {totalCount.toLocaleString()} incidents in the last year
              </p>
            </div>
          </div>

          {/* Legend - Responsive */}
          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
            <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Less</span>
            <div className="flex gap-1 sm:gap-1.5">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-slate-100 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-green-200 dark:bg-green-900/50 border border-green-300 dark:border-green-800" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-yellow-200 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-800" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-orange-300 dark:bg-orange-900/50 border border-orange-400 dark:border-orange-800" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-red-400 dark:bg-red-900/50 border border-red-500 dark:border-red-800" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">More</span>
          </div>
        </div>

        {/* Heatmap Grid Container */}
        <div
          className="relative overflow-x-auto pb-2 -mx-1 px-1 flex justify-center"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-full flex flex-col">
            {/* Month Labels Row - Dynamically positioned */}
            <div
              className="flex mb-2 h-4 relative"
              style={{ marginLeft: showDayLabels ? '24px' : '0' }}
            >
              {monthLabels.map((m, i) => (
                <div
                  key={`month-${i}`}
                  className="absolute font-semibold text-muted-foreground uppercase tracking-wider"
                  style={{
                    left: `${m.weekIndex * weekWidth}px`,
                    fontSize: `${fontSize}px`,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap: `${cellGap}px` }}>
              {/* Day of Week Labels (Left Column) - Conditionally rendered */}
              {showDayLabels && (
                <div
                  className="grid grid-rows-7 mr-1 sm:mr-2 font-medium text-muted-foreground"
                  style={{
                    gap: `${cellGap}px`,
                    fontSize: `${fontSize - 1}px`,
                    lineHeight: `${cellSize}px`,
                  }}
                >
                  <span></span>
                  <span>M</span>
                  <span></span>
                  <span>W</span>
                  <span></span>
                  <span>F</span>
                  <span></span>
                </div>
              )}

              {/* Weeks Columns */}
              {weeks.map((week, wIdx) => (
                <div
                  key={`week-${wIdx}`}
                  className="grid grid-rows-7"
                  style={{ gap: `${cellGap}px` }}
                >
                  {week.days.map((day, dIdx) => (
                    <Tooltip key={`${wIdx}-${dIdx}`} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'rounded-sm transition-all duration-150 border',
                            getColor(day.count),
                            day.count > 0 &&
                            'hover:ring-2 hover:ring-primary/30 hover:z-10 relative cursor-pointer'
                          )}
                          style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="p-2 bg-slate-900 border-slate-800 text-xs shadow-xl">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="font-bold text-slate-100">{day.count} incidents</span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-400">
                            {day.date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Summary if needed */}
      {totalCount === 0 && (
        <div className="mt-4 text-center p-3 sm:p-4 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            No incidents recorded in this period.
          </p>
        </div>
      )}
    </TooltipProvider>
  );
}
