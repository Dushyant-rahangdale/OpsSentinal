'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, Metric } from 'next/web-vitals';

/**
 * Web Vitals Reporter Component
 * 
 * Collects and reports Core Web Vitals and other performance metrics
 * to help monitor real user performance.
 * 
 * Metrics tracked:
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FID (First Input Delay): Interactivity
 * - FCP (First Contentful Paint): Perceived load speed
 * - LCP (Largest Contentful Paint): Loading performance
 * - TTFB (Time to First Byte): Server response time
 * - INP (Interaction to Next Paint): Responsiveness (replaces FID)
 */
export default function WebVitalsReporter() {
  useEffect(() => {
    // Function to send metrics to our API
    const reportMetric = async (metric: Metric) => {
      // Only report in production or when explicitly enabled
      if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS) {
        return;
      }

      try {
        // Send to our API endpoint
        await fetch('/api/web-vitals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: metric.name,
            value: metric.value,
            id: metric.id,
            rating: metric.rating,
            delta: metric.delta,
            navigationType: metric.navigationType,
            // Additional context
            url: window.location.pathname,
            timestamp: Date.now(),
          }),
          // Don't block on this request
          keepalive: true,
        });
      } catch (error) {
        // Silently fail - don't impact user experience
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to report Web Vital:', error);
        }
      }
    };

    // Register all Web Vitals
    onCLS(reportMetric); // Cumulative Layout Shift
    onFID(reportMetric); // First Input Delay (legacy, but still useful)
    onFCP(reportMetric); // First Contentful Paint
    onLCP(reportMetric); // Largest Contentful Paint
    onTTFB(reportMetric); // Time to First Byte
    onINP(reportMetric); // Interaction to Next Paint (new metric)

    // Log metrics in development for debugging
    if (process.env.NODE_ENV === 'development') {
      const logMetric = (metric: Metric) => {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: `${metric.value.toFixed(2)}ms`,
          rating: metric.rating,
          id: metric.id,
        });
      };

      onCLS(logMetric);
      onFID(logMetric);
      onFCP(logMetric);
      onLCP(logMetric);
      onTTFB(logMetric);
      onINP(logMetric);
    }
  }, []);

  // This component doesn't render anything
  return null;
}

