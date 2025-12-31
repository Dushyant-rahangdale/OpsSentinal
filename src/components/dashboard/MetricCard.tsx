import React from 'react';
import styles from './Dashboard.module.css';

type MetricCardProps = {
  label: string;
  value: number | string;
  rangeLabel?: string;
};

export default function MetricCard({ label, value, rangeLabel }: MetricCardProps) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>
        {label} {rangeLabel && rangeLabel}
      </div>
    </div>
  );
}
