'use client';

import { useMemo } from 'react';
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
}

export function IncidentHeatmapWidget({
    data,
    rangeLabel,
    startDate,
    endDate,
}: IncidentHeatmapWidgetProps) {
    const { weeks, monthLabels, totalCount } = useMemo(() => {
        const rawData = data || [];
        const dataMap = new Map<string, number>();
        let total = 0;
        rawData.forEach(point => {
            dataMap.set(point.date, (dataMap.get(point.date) || 0) + point.count);
            total += point.count;
        });

        // Determine range (default to last 365 days if not provided)
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

        // Normalize to midnight
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // Generate all days
        const days: { date: Date; dateStr: string; count: number }[] = [];
        const curr = new Date(start);

        // Align start to the previous Sunday (or Monday based on locale, sticking to Sun for standard heatmap)
        const dayOfWeek = curr.getDay(); // 0 = Sunday
        curr.setDate(curr.getDate() - dayOfWeek);

        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            days.push({
                date: new Date(curr),
                dateStr,
                count: dataMap.get(dateStr) || 0,
            });
            curr.setDate(curr.getDate() + 1);
        }

        // Chunk into weeks
        const weeks: { days: typeof days }[] = [];
        let currentMonth: string | null = null;
        const monthLabels: { label: string; weekIndex: number }[] = [];

        for (let i = 0; i < days.length; i += 7) {
            const weekDays = days.slice(i, i + 7);
            weeks.push({ days: weekDays });

            // Check for month change in this week
            // We verify the first day of the week to place the label
            const firstDay = weekDays[0].date;
            const monthName = firstDay.toLocaleString('default', { month: 'short' });

            if (monthName !== currentMonth) {
                monthLabels.push({ label: monthName, weekIndex: weeks.length - 1 });
                currentMonth = monthName;
            }
        }

        return { weeks, monthLabels, totalCount: total };
    }, [data, startDate, endDate]);

    // Color Scale - "Heartmap" Theme (Rose/Red)
    const getColor = (count: number) => {
        if (count === 0) return 'bg-slate-50 border-slate-200/60';
        if (count <= 2) return 'bg-rose-100 border-rose-200';
        if (count <= 5) return 'bg-rose-300 border-rose-400';
        if (count <= 9) return 'bg-rose-500 border-rose-600';
        return 'bg-rose-600 border-rose-700 shadow-sm shadow-rose-900/20';
    };

    return (
        <div className="group relative rounded-2xl border border-slate-200/60 bg-white/50 shadow-sm hover:shadow-md transition-all duration-300 p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-100 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Incident Activity</h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                            {totalCount} incidents in the last year
                        </p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-400">Less</span>
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-[3px] bg-slate-50 border border-slate-200/60" />
                        <div className="w-3 h-3 rounded-[3px] bg-rose-100 border border-rose-200" />
                        <div className="w-3 h-3 rounded-[3px] bg-rose-300 border border-rose-400" />
                        <div className="w-3 h-3 rounded-[3px] bg-rose-500 border border-rose-600" />
                        <div className="w-3 h-3 rounded-[3px] bg-rose-600 border border-rose-700" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">More</span>
                </div>
            </div>

            {/* Heatmap Grid Container */}
            <div className="relative overflow-x-auto pb-2 scrollbar-hide">
                <div className="min-w-max">
                    {/* Month Labels Row */}
                    <div className="flex mb-2 h-4 relative">
                        {monthLabels.map((m, i) => (
                            <div
                                key={i}
                                className="absolute text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                style={{ left: `${m.weekIndex * 14}px` }} // 14px roughly matches w-3 + gap
                            >
                                {m.label}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-[3px]">
                        {/* Day of Week Labels (Left Column) */}
                        <div className="grid grid-rows-7 gap-[3px] mr-2 text-[9px] font-medium text-slate-300 leading-[12px]">
                            <span></span>
                            <span>M</span>
                            <span></span>
                            <span>W</span>
                            <span></span>
                            <span>F</span>
                            <span></span>
                        </div>

                        {/* Weeks Columns */}
                        {weeks.map((week, wIdx) => (
                            <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                                {week.days.map((day, dIdx) => (
                                    <Tooltip
                                        key={`${wIdx}-${dIdx}`}
                                        content={
                                            <div className="text-center p-1">
                                                <div className="font-bold text-rose-100 mb-0.5">{day.count} incidents</div>
                                                <div className="text-slate-400 text-[10px]">{day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            </div>
                                        }
                                    >
                                        <div
                                            className={cn(
                                                "w-3 h-3 rounded-[3px] transition-all duration-200 border",
                                                getColor(day.count),
                                                day.count > 0 && "hover:ring-2 hover:ring-rose-200 hover:z-10 relative"
                                            )}
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
                <div className="mt-4 text-center p-4 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
                    <p className="text-xs text-slate-500">No incidents recorded in this period.</p>
                </div>
            )}
        </div>
    );
}
