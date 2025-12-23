'use client';

import { FormField } from '@/components/ui';

export type ImpactMetrics = {
    usersAffected?: number;
    downtimeMinutes?: number;
    errorRate?: number;
    servicesAffected?: string[];
    slaBreaches?: number;
    revenueImpact?: number;
    apiErrors?: number;
    performanceDegradation?: number;
};

interface PostmortemImpactInputProps {
    metrics: ImpactMetrics;
    onChange: (metrics: ImpactMetrics) => void;
}

export default function PostmortemImpactInput({ metrics, onChange }: PostmortemImpactInputProps) {
    const updateMetric = (key: keyof ImpactMetrics, value: any) => {
        onChange({ ...metrics, [key]: value });
    };

    const updateServicesAffected = (value: string) => {
        const services = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
        updateMetric('servicesAffected', services);
    };

    return (
        <div style={{ 
            padding: 'var(--spacing-4)', 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--spacing-4)' }}>
                Impact Assessment
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                <FormField
                    label="Users Affected"
                    type="number"
                    value={metrics.usersAffected?.toString() || ''}
                    onChange={(e) => updateMetric('usersAffected', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    helperText="Number of users impacted"
                />
                <FormField
                    label="Downtime (minutes)"
                    type="number"
                    value={metrics.downtimeMinutes?.toString() || ''}
                    onChange={(e) => updateMetric('downtimeMinutes', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    helperText="Total downtime duration"
                />
                <FormField
                    label="Error Rate (%)"
                    type="number"
                    value={metrics.errorRate?.toString() || ''}
                    onChange={(e) => updateMetric('errorRate', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0"
                    helperText="Peak error rate percentage"
                    step="0.1"
                />
                <FormField
                    label="API Errors"
                    type="number"
                    value={metrics.apiErrors?.toString() || ''}
                    onChange={(e) => updateMetric('apiErrors', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    helperText="Total API errors during incident"
                />
                <FormField
                    label="SLA Breaches"
                    type="number"
                    value={metrics.slaBreaches?.toString() || ''}
                    onChange={(e) => updateMetric('slaBreaches', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    helperText="Number of SLA violations"
                />
                <FormField
                    label="Performance Degradation (%)"
                    type="number"
                    value={metrics.performanceDegradation?.toString() || ''}
                    onChange={(e) => updateMetric('performanceDegradation', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0"
                    helperText="Performance impact percentage"
                    step="0.1"
                />
                <FormField
                    label="Revenue Impact ($)"
                    type="number"
                    value={metrics.revenueImpact?.toString() || ''}
                    onChange={(e) => updateMetric('revenueImpact', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0"
                    helperText="Estimated revenue impact (optional)"
                    step="0.01"
                />
                <FormField
                    label="Services Affected"
                    value={metrics.servicesAffected?.join(', ') || ''}
                    onChange={(e) => updateServicesAffected(e.target.value)}
                    placeholder="Service 1, Service 2, Service 3"
                    helperText="Comma-separated list of affected services"
                />
            </div>
        </div>
    );
}





