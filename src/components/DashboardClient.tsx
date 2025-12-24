'use client';

import { Suspense, lazy } from 'react';
import DashboardRealtimeWrapper from './DashboardRealtimeWrapper';
import DashboardSkeleton from './DashboardSkeleton';

// Lazy load heavy dashboard components
const DashboardPerformanceMetrics = lazy(() => import('./DashboardPerformanceMetrics'));
const DashboardAdvancedMetrics = lazy(() => import('./DashboardAdvancedMetrics'));
const DashboardStatusChart = lazy(() => import('./DashboardStatusChart'));
const DashboardServiceHealth = lazy(() => import('./DashboardServiceHealth'));
const DashboardUrgencyDistribution = lazy(() => import('./DashboardUrgencyDistribution'));
const DashboardSLAMetrics = lazy(() => import('./DashboardSLAMetrics'));

interface DashboardClientProps {
  children: React.ReactNode;
}

/**
 * Client-side wrapper for dashboard with real-time updates and lazy loading
 */
export default function DashboardClient({ children }: DashboardClientProps) {
  return (
    <DashboardRealtimeWrapper>
      <Suspense fallback={<DashboardSkeleton />}>
        {children}
      </Suspense>
    </DashboardRealtimeWrapper>
  );
}

// Export lazy-loaded components for use in server components
export {
  DashboardPerformanceMetrics,
  DashboardAdvancedMetrics,
  DashboardStatusChart,
  DashboardServiceHealth,
  DashboardUrgencyDistribution,
  DashboardSLAMetrics,
};

