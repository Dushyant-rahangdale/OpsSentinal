interface PieChartData {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: PieChartData[];
    size?: number;
    showLegend?: boolean;
}

export default function PieChart({ data, size = 120, showLegend = true }: PieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="analytics-pie-chart-empty">
                <span>No data</span>
            </div>
        );
    }

    let currentAngle = -90;
    const segments = data.map((item) => {
        const percentage = (item.value / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle += angle;

        const startAngleRad = (startAngle * Math.PI) / 180;
        const endAngleRad = (endAngle * Math.PI) / 180;
        const radius = size / 2 - 4;
        const x1 = size / 2 + radius * Math.cos(startAngleRad);
        const y1 = size / 2 + radius * Math.sin(startAngleRad);
        const x2 = size / 2 + radius * Math.cos(endAngleRad);
        const y2 = size / 2 + radius * Math.sin(endAngleRad);
        const largeArc = angle > 180 ? 1 : 0;

        return {
            ...item,
            percentage,
            path: `M ${size / 2} ${size / 2} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
        };
    });

    return (
        <div className="analytics-pie-chart-container">
            <svg width={size} height={size} className="analytics-pie-chart">
                {segments.map((segment, index) => (
                    <path
                        key={index}
                        d={segment.path}
                        fill={segment.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="analytics-pie-segment"
                    />
                ))}
            </svg>
            {showLegend && (
                <div className="analytics-pie-legend">
                    {segments.map((segment, index) => (
                        <div key={index} className="analytics-pie-legend-item">
                            <span 
                                className="analytics-pie-legend-color" 
                                style={{ backgroundColor: segment.color }}
                            />
                            <span className="analytics-pie-legend-label">{segment.label}</span>
                            <span className="analytics-pie-legend-value">{segment.value} ({segment.percentage.toFixed(1)}%)</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

