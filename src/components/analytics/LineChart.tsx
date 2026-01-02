import React from 'react';

interface LineChartProps {
    data: any[];
    lines: { key: string; color: string; label: string }[];
    height?: number;
    valueFormatter?: (val: number) => string;
}

export default function LineChart({ data, lines, height = 200, valueFormatter = (v) => v.toString() }: LineChartProps) {
    if (!data.length) return <div className="flex items-center justify-center text-muted-foreground h-full">No data</div>;

    const padding = 20;
    const chartHeight = height - padding * 2;
    // Calculate Min/Max
    let maxVal = 0;
    data.forEach(d => {
        lines.forEach(l => {
            if (d[l.key] > maxVal) maxVal = d[l.key];
        });
    });
    // Add 10% headroom
    maxVal = maxVal * 1.1;
    if (maxVal === 0) maxVal = 1;

    const getX = (index: number) => {
        return (index / (data.length - 1)) * 100;
    };

    const getY = (val: number) => {
        return 100 - (val / maxVal) * 100;
    };

    return (
        <div className="analytics-line-chart" style={{ height: `${height}px`, width: '100%', position: 'relative' }}>
            {/* Legend */}
            <div className="absolute top-0 right-0 flex gap-4 text-xs">
                {lines.map(l => (
                    <div key={l.key} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                        <span className="text-muted-foreground">{l.label}</span>
                    </div>
                ))}
            </div>

            {/* Chart Area */}
            <div className="w-full h-full pt-6 pb-2 relative">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                    {/* Grid Lines */}
                    {[0, 25, 50, 75, 100].map(p => (
                        <line
                            key={p}
                            x1="0%"
                            y1={`${p}%`}
                            x2="100%"
                            y2={`${p}%`}
                            stroke="currentColor"
                            strokeOpacity="0.1"
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* Lines */}
                    {lines.map((line) => {
                        const points = data.map((d, i) => {
                            const x = getX(i);
                            const y = getY(d[line.key] || 0);
                            return `${x},${y}`;
                        }).join(' ');

                        return (
                            <polyline
                                key={line.key}
                                points={points}
                                fill="none"
                                stroke={line.color}
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                                pointsAtX="0, 25, 50, 75, 100" // Not valid SVG, but points are percentages
                            />
                        );
                    })}
                </svg>

                {/* SVG doesn't handle percentage points nicely in polyline usually without viewBox logic. 
                    Standard SVG polyline expects absolute coordinates if not using viewBox.
                    But 0-100 coordinates work if we use viewBox="0 0 100 100". 
                */}
            </div>
        </div>
    );
}
