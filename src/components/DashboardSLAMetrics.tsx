'use client';

import { Card, Badge } from '@/components/ui';
import { formatTimeMinutes } from '@/lib/time-format';

type SLAMetrics = {
    mttr: number | null;
    mttd: number | null;
    mtti: number | null;
    mttk: number | null;
    ackCompliance: number;
    resolveCompliance: number;
    totalIncidents: number;
    ackBreaches: number;
    resolveBreaches: number;
};

type DashboardSLAMetricsProps = {
    metrics: SLAMetrics;
    period?: string;
};

export default function DashboardSLAMetrics({ metrics, period = 'Last 30 days' }: DashboardSLAMetricsProps) {
    const ackComplianceColor = metrics.ackCompliance >= 95 ? 'success' :
                               metrics.ackCompliance >= 80 ? 'warning' : 'error';
    
    const resolveComplianceColor = metrics.resolveCompliance >= 95 ? 'success' :
                                    metrics.resolveCompliance >= 80 ? 'warning' : 'error';

    return (
        <Card variant="elevated">
            <div style={{ padding: 'var(--spacing-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-1)' }}>
                            SLA Metrics
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                            {period}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
                    {/* Acknowledgment Compliance */}
                    <div style={{
                        padding: 'var(--spacing-4)',
                        background: 'var(--color-neutral-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-neutral-200)',
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-2)' }}>
                            Acknowledgment Compliance
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
                            <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
                                {metrics.ackCompliance.toFixed(1)}%
                            </span>
                            <Badge variant={ackComplianceColor as any} size="sm">
                                {metrics.ackCompliance >= 95 ? 'Excellent' : metrics.ackCompliance >= 80 ? 'Good' : 'Needs Improvement'}
                            </Badge>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            {metrics.ackBreaches} breach{metrics.ackBreaches !== 1 ? 'es' : ''} out of {metrics.totalIncidents} incidents
                        </div>
                    </div>

                    {/* Resolution Compliance */}
                    <div style={{
                        padding: 'var(--spacing-4)',
                        background: 'var(--color-neutral-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-neutral-200)',
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-2)' }}>
                            Resolution Compliance
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
                            <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
                                {metrics.resolveCompliance.toFixed(1)}%
                            </span>
                            <Badge variant={resolveComplianceColor as any} size="sm">
                                {metrics.resolveCompliance >= 95 ? 'Excellent' : metrics.resolveCompliance >= 80 ? 'Good' : 'Needs Improvement'}
                            </Badge>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            {metrics.resolveBreaches} breach{metrics.resolveBreaches !== 1 ? 'es' : ''} out of {metrics.totalIncidents} incidents
                        </div>
                    </div>

                    {/* MTTR */}
                    {metrics.mttr !== null && (
                        <div style={{
                            padding: 'var(--spacing-4)',
                            background: 'var(--color-neutral-50)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-neutral-200)',
                        }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-2)' }}>
                                Mean Time To Resolve
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
                                {formatTimeMinutes(metrics.mttr)}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                Average resolution time
                            </div>
                        </div>
                    )}

                    {/* MTTD */}
                    {metrics.mttd !== null && (
                        <div style={{
                            padding: 'var(--spacing-4)',
                            background: 'var(--color-neutral-50)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-neutral-200)',
                        }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-2)' }}>
                                Mean Time To Detect
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
                                {formatTimeMinutes(metrics.mttd)}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                Average detection time
                            </div>
                        </div>
                    )}
                </div>

                {/* Breach Summary */}
                {(metrics.ackBreaches > 0 || metrics.resolveBreaches > 0) && (
                    <div style={{
                        marginTop: 'var(--spacing-4)',
                        padding: 'var(--spacing-3)',
                        background: 'var(--color-warning-light)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-warning)',
                    }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-warning-dark)', marginBottom: 'var(--spacing-1)' }}>
                            ⚠️ SLA Breaches Detected
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            {metrics.ackBreaches > 0 && `${metrics.ackBreaches} acknowledgment breach${metrics.ackBreaches !== 1 ? 'es' : ''}`}
                            {metrics.ackBreaches > 0 && metrics.resolveBreaches > 0 && ' • '}
                            {metrics.resolveBreaches > 0 && `${metrics.resolveBreaches} resolution breach${metrics.resolveBreaches !== 1 ? 'es' : ''}`}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}







