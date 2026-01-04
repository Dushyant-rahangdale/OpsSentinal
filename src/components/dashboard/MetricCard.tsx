'use client';

import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import styles from './Dashboard.module.css';

type MetricCardProps = {
  label: string;
  value: number | string;
  rangeLabel?: string;
  isDark?: boolean;
};

/**
 * Optimized count-up hook with stable animation
 * - Uses ref to track animation state to prevent memory leaks
 * - Handles edge cases: NaN, negative, zero values
 * - Only re-animates when the target value actually changes
 */
const useCountUp = (end: number, duration = 800) => {
  const [count, setCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const prevEndRef = useRef<number>(end);

  useEffect(() => {
    // Guard against invalid values
    if (!Number.isFinite(end) || end < 0) {
      setCount(0);
      return;
    }

    // Skip animation if value hasn't changed
    if (prevEndRef.current === end && count === end) {
      return;
    }
    prevEndRef.current = end;

    // For zero, just set immediately
    if (end === 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    const startValue = count;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quartic for smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 4);

      const newCount = Math.round(startValue + (end - startValue) * ease);
      setCount(newCount);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at the target
        setCount(end);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [end, duration, count]);

  return count;
};

/**
 * MetricCard Component
 * Displays a single metric with optional animation and range label
 */
const MetricCard = memo(function MetricCard({
  label,
  value,
  rangeLabel,
  isDark = false,
}: MetricCardProps) {
  // Parse value and determine if we should animate
  const { shouldAnimate, numericEnd, displayString } = React.useMemo(() => {
    if (typeof value === 'number') {
      // Guard against NaN and infinity
      if (!Number.isFinite(value)) {
        return { shouldAnimate: false, numericEnd: 0, displayString: 'N/A' };
      }
      return { shouldAnimate: true, numericEnd: Math.max(0, value), displayString: '' };
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Empty string
      if (trimmed === '') {
        return { shouldAnimate: false, numericEnd: 0, displayString: '0' };
      }
      // Check if it looks like a pure number (allowing commas)
      const clean = trimmed.replace(/,/g, '');
      const parsed = Number(clean);
      if (!isNaN(parsed) && Number.isFinite(parsed) && /^[\d,]+$/.test(trimmed)) {
        return { shouldAnimate: true, numericEnd: Math.max(0, parsed), displayString: '' };
      }
      // Keep as string (e.g., percentages, special values)
      return { shouldAnimate: false, numericEnd: 0, displayString: trimmed };
    }

    return { shouldAnimate: false, numericEnd: 0, displayString: String(value ?? 'N/A') };
  }, [value]);

  const animatedValue = useCountUp(shouldAnimate ? numericEnd : 0);

  // Format the display value
  const formattedDisplay = shouldAnimate
    ? animatedValue.toLocaleString()
    : displayString;

  // Memoized hover handlers
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDark) {
        e.currentTarget.style.background = 'var(--color-neutral-100)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }
    },
    [isDark]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDark) {
        e.currentTarget.style.background = 'var(--color-neutral-50)';
        e.currentTarget.style.transform = 'translateY(0)';
      }
    },
    [isDark]
  );

  return (
    <div
      className={`${styles.metricCard} ${isDark ? styles.hoverGlowEffect : ''}`}
      style={{
        padding: '1.5rem 1rem',
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--color-neutral-50)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center' as const,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        transform: 'translateZ(0)',
        boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="figure"
      aria-label={`${label}: ${formattedDisplay}${rangeLabel ? ` ${rangeLabel}` : ''}`}
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
        aria-live="polite"
      >
        {formattedDisplay}
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
});

export default MetricCard;
