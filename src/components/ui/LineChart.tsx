'use client';

import { ReactNode } from 'react';

interface DataPoint {
  x: string | number;
  y: number;
  label?: string;
}

interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showPoints?: boolean;
  showArea?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  className?: string;
}

export default function LineChart({
  data,
  width = 400,
  height = 200,
  color = 'var(--primary)',
  showGrid = true,
  showPoints = true,
  showArea = false,
  xAxisLabel,
  yAxisLabel,
  className = '',
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        No data available
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xValues = data.map((d) => (typeof d.x === 'number' ? d.x : parseFloat(String(d.x))));
  const yValues = data.map((d) => d.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const scaleX = (value: number) => ((value - minX) / (maxX - minX || 1)) * chartWidth;
  const scaleY = (value: number) => chartHeight - ((value - minY) / (maxY - minY || 1)) * chartHeight;

  const points = data.map((d, i) => {
    const x = typeof d.x === 'number' ? d.x : parseFloat(String(d.x));
    return {
      x: scaleX(x) + padding.left,
      y: scaleY(d.y) + padding.top,
      label: d.label || String(d.x),
      value: d.y,
    };
  });

  const pathData = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = showArea
    ? `${pathData} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : '';

  return (
    <div className={`ui-line-chart ${className}`} style={{ width, height }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {showGrid && (
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + ratio * chartHeight;
              return (
                <line
                  key={`grid-y-${ratio}`}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity={0.5}
                />
              );
            })}
          </g>
        )}

        {/* Area fill */}
        {showArea && areaPath && (
          <path
            d={areaPath}
            fill={color}
            opacity={0.2}
          />
        )}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {showPoints &&
          points.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
              <title>{`${point.label}: ${point.value}`}</title>
            </g>
          ))}

        {/* X Axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="var(--border)"
          strokeWidth="1"
        />

        {/* Y Axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="var(--border)"
          strokeWidth="1"
        />

        {/* X Axis Labels */}
        {points.map((point, i) => {
          if (i % Math.ceil(points.length / 5) !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={i}
              x={point.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {point.label}
            </text>
          );
        })}

        {/* Y Axis Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = minY + ratio * (maxY - minY);
          const y = padding.top + (1 - ratio) * chartHeight;
          return (
            <text
              key={`y-label-${ratio}`}
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {value.toFixed(1)}
            </text>
          );
        })}

        {/* Axis Labels */}
        {xAxisLabel && (
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            fontSize="12"
            fill="var(--text-secondary)"
            fontWeight={500}
          >
            {xAxisLabel}
          </text>
        )}
        {yAxisLabel && (
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            fontSize="12"
            fill="var(--text-secondary)"
            fontWeight={500}
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            {yAxisLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

