import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';

type MetricCardProps = {
  label: string;
  value: number | string;
  rangeLabel?: string;
  isDark?: boolean;
};

/**
 * Simple count-up hook
 */
const useCountUp = (end: number, duration = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Ease out quartic
      const ease = 1 - Math.pow(1 - progress, 4);

      setCount(Math.floor(ease * end));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [end, duration]);

  return count;
};

export default function MetricCard({ label, value, rangeLabel, isDark = false }: MetricCardProps) {
  // Parsing logic: only animate if it's explicitly a number or a simple numeric string
  // If it contains non-numeric chars (like %), treat as string to preserve format
  // BUT user wants animations. So standard integers should animate.

  let shouldAnimate = false;
  let numericEnd = 0;

  if (typeof value === 'number') {
    shouldAnimate = true;
    numericEnd = value;
  } else if (typeof value === 'string') {
    // Check if it looks like a number
    const clean = value.replace(/,/g, ''); // Allow commas
    if (!isNaN(Number(clean)) && clean.trim() !== '') {
      shouldAnimate = true;
      numericEnd = Number(clean);
    }
  }

  const animatedValue = useCountUp(shouldAnimate ? numericEnd : 0);
  const displayValue = shouldAnimate ? animatedValue : value;

  return (
    <div
      className={`${styles.metricCard} ${isDark ? styles.hoverGlowEffect : ''}`}
      style={{
        padding: '1.5rem 1rem', // Increased padding
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--color-neutral-50)', // Lighter touch for dark mode
        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center' as const,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        transform: 'translateZ(0)',
        boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none', // Top lighting
      }}
      onMouseEnter={e => {
        if (!isDark) {
          e.currentTarget.style.background = 'var(--color-neutral-100)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        if (!isDark) {
          e.currentTarget.style.background = 'var(--color-neutral-50)';
          e.currentTarget.style.transform = 'translateY(0)';
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
          fontVariantNumeric: 'tabular-nums',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {shouldAnimate ? animatedValue.toLocaleString() : displayValue}
      </div>
      <div
        className={styles.metricLabel}
        style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-medium)',
          color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {label}{' '}
        {rangeLabel && <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>{rangeLabel}</span>}
      </div>
    </div>
  );
}
