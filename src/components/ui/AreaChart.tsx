'use client';

import LineChart from './LineChart';

interface DataPoint {
  x: string | number;
  y: number;
  label?: string;
}

interface AreaChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showPoints?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  className?: string;
}

export default function AreaChart(props: AreaChartProps) {
  return <LineChart {...props} showArea={true} />;
}


