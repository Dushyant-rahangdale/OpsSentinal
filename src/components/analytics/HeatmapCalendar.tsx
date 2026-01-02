'use client';

interface HeatmapCalendarProps {
    data: { date: string; count: number }[];
    weeks?: number;
    cellSize?: number;
    gap?: number;
}

const getIntensityColor = (count: number, maxCount: number): string => {
    if (count === 0) return 'rgba(34, 197, 94, 0.15)'; // Light green for zero
    const intensity = Math.min(1, count / Math.max(1, maxCount));
    if (intensity < 0.25) return 'rgba(34, 197, 94, 0.5)';  // Green - low
    if (intensity < 0.5) return 'rgba(234, 179, 8, 0.6)';   // Yellow - medium
    if (intensity < 0.75) return 'rgba(249, 115, 22, 0.7)'; // Orange - high
    return 'rgba(239, 68, 68, 0.85)';                        // Red - critical
};

const getDayLabel = (dayIndex: number): string => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return days[dayIndex];
};

export default function HeatmapCalendar({
    data,
    weeks = 12,
    cellSize = 12,
    gap = 3
}: HeatmapCalendarProps) {
    const dataMap = new Map(data.map(d => [d.date, d.count]));
    const maxCount = Math.max(1, ...data.map(d => d.count));

    // Generate week columns (newest on right)
    const today = new Date();
    const cells: { date: Date; count: number; x: number; y: number }[] = [];

    for (let weekOffset = weeks - 1; weekOffset >= 0; weekOffset--) {
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (weekOffset * 7 + (6 - dayOfWeek)));

            const dateKey = date.toISOString().split('T')[0];
            const count = dataMap.get(dateKey) || 0;

            const x = (weeks - 1 - weekOffset) * (cellSize + gap);
            const y = dayOfWeek * (cellSize + gap);

            cells.push({ date, count, x, y });
        }
    }

    const width = weeks * (cellSize + gap) - gap + 20; // Extra space for day labels
    const height = 7 * (cellSize + gap) - gap;

    return (
        <div className="heatmap-calendar-container">
            <svg width={width} height={height} style={{ overflow: 'visible' }}>
                {/* Day labels */}
                {[1, 3, 5].map(dayIndex => (
                    <text
                        key={dayIndex}
                        x={-8}
                        y={dayIndex * (cellSize + gap) + cellSize / 2 + 3}
                        fill="#6b7280"
                        fontSize={9}
                        textAnchor="end"
                    >
                        {getDayLabel(dayIndex)}
                    </text>
                ))}

                {/* Cells */}
                {cells.map((cell, i) => (
                    <g key={i}>
                        <rect
                            x={cell.x}
                            y={cell.y}
                            width={cellSize}
                            height={cellSize}
                            rx={2}
                            fill={getIntensityColor(cell.count, maxCount)}
                            className="heatmap-cell"
                            style={{ transition: 'fill 0.2s ease' }}
                        >
                            <title>{`${cell.date.toLocaleDateString()}: ${cell.count} incident${cell.count !== 1 ? 's' : ''}`}</title>
                        </rect>
                    </g>
                ))}
            </svg>

            {/* Legend */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 8,
                justifyContent: 'flex-end'
            }}>
                <span style={{ fontSize: 10, color: '#6b7280', marginRight: 4 }}>Good</span>
                {[
                    'rgba(34, 197, 94, 0.15)',  // Light green
                    'rgba(34, 197, 94, 0.5)',   // Green
                    'rgba(234, 179, 8, 0.6)',   // Yellow
                    'rgba(249, 115, 22, 0.7)',  // Orange
                    'rgba(239, 68, 68, 0.85)'   // Red
                ].map((color, i) => (
                    <div
                        key={i}
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            backgroundColor: color,
                            border: '1px solid rgba(0,0,0,0.1)'
                        }}
                    />
                ))}
                <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 4 }}>Critical</span>
            </div>
        </div>
    );
}
