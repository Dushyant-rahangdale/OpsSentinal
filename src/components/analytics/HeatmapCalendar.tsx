'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface HeatmapCalendarProps {
  data: { date: string; count: number }[];
  startDate?: Date;
  days?: number; // Changed from weeks to days to match usage
  cellSize?: number;
  gap?: number;
  fitWidth?: boolean;
}

const getIntensityColor = (count: number, maxCount: number): string => {
  if (count < 0) return 'transparent';
  if (count === 0) return '#22c55e';

  const intensity = maxCount > 0 ? count / maxCount : 0;
  if (intensity <= 0.5) return '#22c55e';
  if (intensity <= 0.85) return '#f59e0b';
  return '#ef4444';
};

const getDayLabel = (dayIndex: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
};

export default function HeatmapCalendar({
  data,
  startDate,
  days = 90, // Default to ~3 months if not specified
  cellSize = 12,
  gap = 4,
  fitWidth = false,
}: HeatmapCalendarProps) {
  const dataMap = new Map(data.map(d => [d.date, d.count]));
  const maxCount = Math.max(1, ...data.map(d => d.count));

  const today = new Date();
  const rangeStart = startDate ? new Date(startDate) : new Date(today);
  const normalizedStart = new Date(
    rangeStart.getFullYear(),
    rangeStart.getMonth(),
    rangeStart.getDate()
  );
  const rangeEnd = new Date(normalizedStart);
  rangeEnd.setDate(rangeEnd.getDate() + days - 1);

  const startOfWeek = new Date(normalizedStart);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(rangeEnd);
  endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));

  const totalDays = Math.round((endOfWeek.getTime() - startOfWeek.getTime()) / 86400000) + 1;
  const weeks = Math.ceil(totalDays / 7);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!fitWidth || !containerRef.current) return undefined;

    const element = containerRef.current;
    const update = () => setContainerWidth(element.getBoundingClientRect().width);
    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(element);

    return () => observer.disconnect();
  }, [fitWidth]);

  const leftGutter = 24;
  const { effectiveCellSize, effectiveGap } = useMemo(() => {
    if (!fitWidth || !containerWidth) {
      return { effectiveCellSize: cellSize, effectiveGap: gap };
    }

    const availableWidth = Math.max(0, containerWidth - leftGutter);
    const baseWidth = weeks * cellSize + Math.max(0, weeks - 1) * gap;
    const scale = baseWidth > 0 ? availableWidth / baseWidth : 1;
    const scaledCell = Math.floor(cellSize * scale);
    const scaledGap = Math.floor(gap * scale);

    return {
      effectiveCellSize: Math.max(4, Math.min(20, scaledCell)),
      effectiveGap: Math.max(2, Math.min(6, scaledGap)),
    };
  }, [cellSize, containerWidth, fitWidth, gap, weeks]);

  const cells: { date: Date; count: number; x: number; y: number }[] = [];
  const monthLabels: { label: string; x: number }[] = [];
  const monthNames = [
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
  let firstLabelAdded = false;

  for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(weekStart.getDate() + weekIndex * 7);
    let hasMonthStart = false;

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayOfWeek);

      const dateKey = date.toISOString().split('T')[0];
      const inRange = date >= normalizedStart && date <= rangeEnd;
      const count = inRange ? dataMap.get(dateKey) || 0 : -1;
      const x = weekIndex * (effectiveCellSize + effectiveGap);
      const y = dayOfWeek * (effectiveCellSize + effectiveGap) + 16;

      if (inRange && date.getDate() === 1) {
        hasMonthStart = true;
      }

      // Only add if date is within range (mostly implicit by loop but good to control)
      cells.push({ date, count, x, y });
    }

    if (hasMonthStart) {
      monthLabels.push({
        label: monthNames[weekStart.getMonth()],
        x: weekIndex * (effectiveCellSize + effectiveGap),
      });
      firstLabelAdded = true;
    } else if (!firstLabelAdded && weekIndex === 0) {
      monthLabels.push({
        label: monthNames[normalizedStart.getMonth()],
        x: weekIndex * (effectiveCellSize + effectiveGap),
      });
      firstLabelAdded = true;
    }
  }

  const width = weeks * effectiveCellSize + Math.max(0, weeks - 1) * effectiveGap + leftGutter;
  const height = 7 * effectiveCellSize + Math.max(0, 7 - 1) * effectiveGap + 16;

  return (
    <div
      ref={containerRef}
      className="heatmap-calendar-container"
      style={{ width: '100%', overflowX: 'auto' }}
    >
      <svg width={width} height={height} style={{ overflow: 'visible', marginLeft: leftGutter }}>
        {monthLabels.map((label, index) => (
          <text
            key={`${label.label}-${index}`}
            x={label.x}
            y={10}
            fill="#94a3b8"
            fontSize={10}
            textAnchor="start"
            style={{ userSelect: 'none' }}
          >
            {label.label}
          </text>
        ))}
        {/* Day labels */}
        {[1, 3, 5].map(dayIndex => (
          <text
            key={dayIndex}
            x={-6}
            y={dayIndex * (effectiveCellSize + effectiveGap) + effectiveCellSize / 1.5 + 16}
            fill="#94a3b8"
            fontSize={10}
            textAnchor="end"
            style={{ userSelect: 'none' }}
          >
            {getDayLabel(dayIndex).substring(0, 1)}
          </text>
        ))}

        {/* Cells */}
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={effectiveCellSize}
            height={effectiveCellSize}
            rx={3}
            fill={getIntensityColor(cell.count, maxCount)}
            className="heatmap-cell"
            style={{ transition: 'all 0.2s ease', cursor: 'default' }}
          >
            {cell.count >= 0 && (
              <title>{`${cell.date.toLocaleDateString()}: ${cell.count} incident${cell.count !== 1 ? 's' : ''}`}</title>
            )}
          </rect>
        ))}
      </svg>
    </div>
  );
}
