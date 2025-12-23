'use client';

import { ImpactMetrics } from './PostmortemImpactInput';
import BarChart from '@/components/analytics/BarChart';
import PieChart from '@/components/analytics/PieChart';

interface PostmortemImpactMetricsProps {
    metrics: ImpactMetrics;
}

export default function PostmortemImpactMetrics({ metrics }: PostmortemImpactMetricsProps) {
    if (!metrics || Object.keys(metrics).length === 0) {
        return (
            <div style={{ 
                padding: 'var(--spacing-8)', 
                textAlign: 'center',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
            }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-base)' }}>
                    No impact metrics recorded
                </p>
            </div>
        );
    }

    const metricCards = [
        metrics.usersAffected && {
            label: 'Users Affected',
            value: metrics.usersAffected.toLocaleString(),
            color: '#3b82f6',
        },
        metrics.downtimeMinutes && {
            label: 'Downtime',
            value: `${Math.floor(metrics.downtimeMinutes / 60)}h ${metrics.downtimeMinutes % 60}m`,
            color: '#f59e0b',
        },
        metrics.errorRate && {
            label: 'Error Rate',
            value: `${metrics.errorRate.toFixed(1)}%`,
            color: '#ef4444',
        },
        metrics.slaBreaches && {
            label: 'SLA Breaches',
            value: metrics.slaBreaches.toString(),
            color: '#dc2626',
        },
    ].filter(Boolean);

    const servicesData = metrics.servicesAffected && metrics.servicesAffected.length > 0
        ? metrics.servicesAffected.map((service, index) => ({
            key: `service-${index}`,
            label: service,
            count: 1,
        }))
        : [];

    const impactDistribution = [
        metrics.usersAffected && { label: 'Users', value: metrics.usersAffected, color: '#3b82f6' },
        metrics.downtimeMinutes && { label: 'Downtime (min)', value: metrics.downtimeMinutes, color: '#f59e0b' },
        metrics.errorRate && { label: 'Error Rate', value: metrics.errorRate * 10, color: '#ef4444' },
    ].filter(Boolean) as Array<{ label: string; value: number; color: string }>;

    return (
        <div style={{ 
            padding: 'var(--spacing-6)', 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
            <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                Impact Metrics
            </h3>

            {/* Key Metrics Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 'var(--spacing-4)',
                marginBottom: 'var(--spacing-6)',
            }}>
                {metricCards.map((card, index) => (
                    <div
                        key={index}
                        style={{
                            padding: 'var(--spacing-4)',
                            background: 'white',
                            border: `2px solid ${card.color}40`,
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                    >
                        <div style={{ 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--spacing-1)',
                        }}>
                            {card.label}
                        </div>
                        <div style={{ 
                            fontSize: 'var(--font-size-2xl)', 
                            fontWeight: '700',
                            color: card.color,
                        }}>
                            {card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                {servicesData.length > 0 && (
                    <div style={{
                        padding: 'var(--spacing-4)',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)',
                    }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', marginBottom: 'var(--spacing-3)' }}>
                            Services Affected
                        </h4>
                        <BarChart
                            data={servicesData}
                            maxValue={1}
                            height={120}
                            showValues={true}
                        />
                    </div>
                )}

                {impactDistribution.length > 0 && (
                    <div style={{
                        padding: 'var(--spacing-4)',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)',
                    }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', marginBottom: 'var(--spacing-3)' }}>
                            Impact Distribution
                        </h4>
                        <PieChart
                            data={impactDistribution}
                            size={150}
                            showLegend={true}
                        />
                    </div>
                )}
            </div>

            {/* Additional Metrics */}
            {(metrics.apiErrors || metrics.performanceDegradation || metrics.revenueImpact) && (
                <div style={{ 
                    marginTop: 'var(--spacing-4)',
                    padding: 'var(--spacing-4)',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-md)',
                }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', marginBottom: 'var(--spacing-3)' }}>
                        Additional Metrics
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-3)' }}>
                        {metrics.apiErrors && (
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>API Errors</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>{metrics.apiErrors.toLocaleString()}</div>
                            </div>
                        )}
                        {metrics.performanceDegradation && (
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Performance Impact</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: '#ef4444' }}>
                                    {metrics.performanceDegradation.toFixed(1)}%
                                </div>
                            </div>
                        )}
                        {metrics.revenueImpact && (
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Revenue Impact</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: '#dc2626' }}>
                                    ${metrics.revenueImpact.toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}





