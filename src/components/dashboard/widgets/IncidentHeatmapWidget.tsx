'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';

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
    const padding = 16; // Horizontal padding inside the container
    const availableWidth = Math.max(0, containerWidth - dayLabelWidth - padding);

    // Calculate optimal cell size to fill width
    // availableWidth = weeks * cellSize + (weeks - 1) * gap
    // Using gap = cellSize * 0.25
    const gapRatio = 0.25;
    const effectiveWeeks = weeksCount + (weeksCount - 1) * gapRatio;
    const optimalCellSize = effectiveWeeks > 0 ? Math.floor(availableWidth / effectiveWeeks) : 12;

    // Set min/max based on screen size
    let minCell: number;
    let maxCell: number;
    let showLabels = true;
    let fontSz = 10;

    if (containerWidth < 320) {
      minCell = 6;
      maxCell = 10;
      showLabels = false;
      fontSz = 8;
    } else if (containerWidth < 480) {
      minCell = 8;
      maxCell = 12;
      showLabels = false;
      fontSz = 9;
    } else if (containerWidth < 640) {
      minCell = 9;
      maxCell = 14;
      fontSz = 9;
    } else if (containerWidth < 768) {
      minCell = 10;
      maxCell = 16;
      fontSz = 9;
    } else if (containerWidth < 1024) {
      minCell = 11;
      maxCell = 18;
      fontSz = 10;
    } else if (containerWidth < 1440) {
      minCell = 12;
      maxCell = 22;
      fontSz = 10;
    } else {
      // Large screens - allow bigger cells
      minCell = 14;
      maxCell = 28;
      fontSz = 11;
    }

    const scaledCell = Math.max(minCell, Math.min(maxCell, optimalCellSize));
    const scaledGap = Math.max(2, Math.round(scaledCell * gapRatio));

    return {
      cellSize: scaledCell,
      cellGap: scaledGap,
      showDayLabels: showLabels,
      fontSize: fontSz,
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
      const dateStr = curr.toISOString().split('T')[0];
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

    return {
      weeks: weeksArray,
      monthLabels: monthLabelsArray,
      totalCount: total,
      maxCount: max || 1,
    };
  }, [data, startDate, endDate, days]);

  // Improved color scale - matches HeatmapCalendar for consistency
  const getColor = useCallback(
    (count: number) => {
      if (count === 0) return 'bg-slate-100 border-slate-200/60';
      const intensity = count / maxCount;
      if (intensity <= 0.25) return 'bg-green-200 border-green-300';
      if (intensity <= 0.5) return 'bg-yellow-200 border-yellow-300';
      if (intensity <= 0.75) return 'bg-orange-300 border-orange-400';
      return 'bg-red-400 border-red-500';
    },
    [maxCount]
  );

  // Calculate the position multiplier for month labels
  const weekWidth = cellSize + cellGap;

  return (
    <div
      ref={containerRef}
      className="group relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-5 md:p-6 overflow-hidden"
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
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Incident Activity
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              {totalCount.toLocaleString()} incidents in the last year
            </p>
          </div>
        </div>

        {/* Legend - Responsive */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
          <span className="text-[9px] sm:text-[10px] font-medium text-slate-400">Less</span>
          <div className="flex gap-1 sm:gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-slate-100 border border-slate-200/60" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-green-200 border border-green-300" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-yellow-200 border border-yellow-300" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-orange-300 border border-orange-400" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-red-400 border border-red-500" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-medium text-slate-400">More</span>
        </div>
      </div>

      {/* Heatmap Grid Container */}
      <div
        className="relative overflow-x-auto pb-2 -mx-1 px-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="min-w-max">
          {/* Month Labels Row - Dynamically positioned */}
          <div
            className="flex mb-2 h-4 relative"
            style={{ marginLeft: showDayLabels ? '24px' : '0' }}
          >
            {monthLabels.map((m, i) => (
              <div
                key={`month-${i}`}
                className="absolute font-semibold text-slate-400 uppercase tracking-wider"
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
                className="grid grid-rows-7 mr-1 sm:mr-2 font-medium text-slate-300"
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
                  <Tooltip
                    key={`${wIdx}-${dIdx}`}
                    content={
                      <div className="text-center p-1">
                        <div className="font-bold text-slate-100 mb-0.5">{day.count} incidents</div>
                        <div className="text-slate-400 text-[10px]">
                          {day.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    }
                  >
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
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Summary if needed */}
      {totalCount === 0 && (
        <div className="mt-4 text-center p-3 sm:p-4 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
          <p className="text-[11px] sm:text-xs text-slate-500">
            No incidents recorded in this period.
          </p>
        </div>
      )}
    </div>
  );
}
