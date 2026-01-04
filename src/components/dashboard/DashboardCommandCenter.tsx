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
    <div
      style={{
        background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        color: 'white',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem',
          gap: '1rem',
          flexWrap: 'wrap' as const,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 'var(--font-weight-bold)',
              margin: '0 0 0.625rem 0',
              color: 'white',
            }}
          >
            Command Center
          </h1>

          {/* System Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: 'var(--font-size-sm)',
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '0.75rem',
            }}
          >
            <span style={{ fontWeight: 'var(--font-weight-medium)' }}>System Status:</span>
            <strong
              style={{
                color: systemStatus.color,
                fontWeight: 'var(--font-weight-semibold)',
                background: systemStatus.bg,
                padding: '0.125rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
              }}
            >
              {systemStatus.label}
            </strong>
            {allOpenIncidentsCount > 0 && (
              <span style={{ opacity: 0.7, fontSize: 'var(--font-size-xs)' }}>
                ({allOpenIncidentsCount} active incident{allOpenIncidentsCount !== 1 ? 's' : ''})
              </span>
            )}
          </div>

          {/* Time Range */}
          <div>
            <Suspense
              fallback={
                <div
                  style={{
                    height: '32px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    width: '300px',
                  }}
                />
              }
            >
              <DashboardTimeRange />
            </Suspense>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
          }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  height: '36px',
                  width: '80px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                }}
              />
            }
          >
            <DashboardRefresh />
          </Suspense>
          <Suspense
            fallback={
              <div
                style={{
                  height: '36px',
                  width: '100px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                }}
              />
            }
          >
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        <MetricCard label="TOTAL" value={totalInRange} rangeLabel={rangeLabel} isDark />
        <MetricCard label="OPEN" value={metricsOpenCount} rangeLabel={rangeLabel} isDark />
        <MetricCard label="RESOLVED" value={metricsResolvedCount} rangeLabel={rangeLabel} isDark />
        <MetricCard label="UNASSIGNED" value={unassignedCount} rangeLabel="(ALL TIME)" isDark />
      </div>
    </div>
  );
}
