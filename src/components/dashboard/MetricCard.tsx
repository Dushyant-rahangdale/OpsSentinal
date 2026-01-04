import React from 'react';
import styles from './Dashboard.module.css';

type MetricCardProps = {
  label: string;
  value: number | string;
  rangeLabel?: string;
  isDark?: boolean;
};

export default function MetricCard({ label, value, rangeLabel, isDark = false }: MetricCardProps) {
  return (
    <div
      className={styles.metricCard}
      style={{
        padding: '1.25rem 1rem',
        background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'var(--color-neutral-50)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center' as const,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        if (isDark) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
        } else {
          e.currentTarget.style.background = 'var(--color-neutral-100)';
        }
      }}
      onMouseLeave={e => {
        if (isDark) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        } else {
          e.currentTarget.style.background = 'var(--color-neutral-50)';
        }
      }}
    >
      <div
        className={styles.metricValue}
        style={{
          fontSize: '2rem',
          fontWeight: 'var(--font-weight-bold)',
          color: isDark ? 'white' : 'var(--text-primary)',
          marginBottom: '0.375rem',
          lineHeight: '1.1',
        }}
      >
        {value}
      </div>
      <div
        className={styles.metricLabel}
        style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-medium)',
          color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
        }}
      >
        {label}{' '}
        {rangeLabel && <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>{rangeLabel}</span>}
      </div>
    </div>
  );
}
