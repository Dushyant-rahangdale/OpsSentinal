'use client';

import React, { Suspense } from 'react';
import DashboardRefresh from '../DashboardRefresh';
import DashboardExport from '../DashboardExport';
import DashboardTimeRange from '../DashboardTimeRange';
import MetricCard from './MetricCard';
import styles from './Dashboard.module.css';

type SystemStatus = {
  label: string;
  color: string;
  bg: string;
};

type DashboardCommandCenterProps = {
  systemStatus: SystemStatus;
  allOpenIncidentsCount: number;
  totalInRange: number;
  metricsOpenCount: number;
  metricsResolvedCount: number;
  unassignedCount: number;
  rangeLabel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incidents: any[];
  filters: Record<string, string | undefined>;
  currentPeriodAcknowledged: number;
};

export default function DashboardCommandCenter({
  systemStatus,
  allOpenIncidentsCount,
  totalInRange,
  metricsOpenCount,
  metricsResolvedCount,
  unassignedCount,
  rangeLabel,
  incidents,
  filters,
  currentPeriodAcknowledged,
}: DashboardCommandCenterProps) {
  return (
    <div className={styles.hero}>
      {/* Subtle background glow */}
      <div className={styles.heroGlow} />

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Command Center</h1>
          <div className={styles.statusLine}>
            <span>System Status:</span>
            <strong
              className={styles.systemStatusValue}
              style={{ color: systemStatus.color }} // Keeping dynamic color inline for now or could map to classes
            >
              {systemStatus.label}
            </strong>
            {allOpenIncidentsCount > 0 && (
              <span>
                ({allOpenIncidentsCount} active incident{allOpenIncidentsCount !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          <div className={styles.timeRangeWrapper}>
            <Suspense fallback={<div className={styles.skeletonTimeRange} />}>
              <DashboardTimeRange />
            </Suspense>
          </div>
        </div>
        <div className={styles.actions}>
          <Suspense fallback={<div className={styles.skeletonButton} />}>
            <DashboardRefresh />
          </Suspense>
          <Suspense fallback={<div className={styles.skeletonButton} />}>
            <DashboardExport
              incidents={incidents}
              filters={filters}
              metrics={{
                totalOpen: metricsOpenCount,
                totalResolved: metricsResolvedCount,
                totalAcknowledged: currentPeriodAcknowledged,
                unassigned: unassignedCount,
              }}
            />
          </Suspense>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        <MetricCard label="TOTAL" value={totalInRange} rangeLabel={rangeLabel} />
        <MetricCard label="OPEN" value={metricsOpenCount} rangeLabel={rangeLabel} />
        <MetricCard label="RESOLVED" value={metricsResolvedCount} rangeLabel={rangeLabel} />
        <MetricCard label="UNASSIGNED" value={unassignedCount} rangeLabel="(All Time)" />
      </div>
    </div>
  );
}
