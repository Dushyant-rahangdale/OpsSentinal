'use client';

import { useMemo, useState, useEffect } from 'react';

interface Incident {
    id: string;
    serviceId: string;
    createdAt: Date;
    resolvedAt?: Date | null;
    status: string;
    urgency: string;
}

interface Service {
    id: string;
    name: string;
}

interface StatusPageMetricsProps {
    services: Service[];
    incidents: Incident[];
    thirtyDaysAgo: Date;
    ninetyDaysAgo: Date;
}

// Helper function to format percentage consistently (SSR-safe)
function formatUptimePercent(value: number): string {
    // Clamp value between 0 and 100, then round to 3 decimal places
    const clamped = Math.max(0, Math.min(100, value));
    // Round to avoid floating point precision issues
    const rounded = Math.round(clamped * 1000) / 1000;
    return rounded.toFixed(3);
}

export default function StatusPageMetrics({ 
    services, 
    incidents, 
    thirtyDaysAgo, 
    ninetyDaysAgo 
}: StatusPageMetricsProps) {
    const [metrics, setMetrics] = useState<Array<{
        service: string;
        thirtyDays: { uptime: number; downtime: number; incidents: number };
        ninetyDays: { uptime: number; downtime: number; incidents: number };
    }>>([]);
    const [isClient, setIsClient] = useState(false);

    // Calculate metrics only on client to avoid hydration mismatches
    useEffect(() => {
        setIsClient(true);
        
        if (services.length === 0) {
            setMetrics([]);
            return;
        }
        
        // Use current date for calculation
        const periodEnd = new Date();
        
        // Calculate uptime for a service
        const calculateUptime = (serviceId: string, periodStart: Date) => {
            const totalMinutes = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60);
            
            // Get incidents for this service in the period
            const serviceIncidents = incidents.filter(
                inc => inc.serviceId === serviceId && 
                       inc.createdAt >= periodStart &&
                       (inc.resolvedAt || inc.createdAt) <= periodEnd
            );

            // Calculate downtime minutes
            let downtimeMinutes = 0;
            serviceIncidents.forEach(incident => {
                const start = incident.createdAt;
                const end = incident.resolvedAt || periodEnd;
                const incidentMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                downtimeMinutes += incidentMinutes;
            });

            const uptimeMinutes = totalMinutes - downtimeMinutes;
            // Round to avoid floating point precision issues - round to 3 decimal places
            const uptimePercent = totalMinutes > 0 
                ? Math.round((uptimeMinutes / totalMinutes) * 100000) / 1000 
                : 100;

            return {
                uptime: uptimePercent,
                downtime: downtimeMinutes,
                incidents: serviceIncidents.length,
            };
        };

        const calculatedMetrics = services.map(service => ({
            service: service.name,
            thirtyDays: calculateUptime(service.id, thirtyDaysAgo),
            ninetyDays: calculateUptime(service.id, ninetyDaysAgo),
        }));
        
        setMetrics(calculatedMetrics);
    }, [services, incidents, thirtyDaysAgo, ninetyDaysAgo]);

    if (services.length === 0) return null;
    
    // Show loading state during initial render to avoid hydration mismatch
    if (!isClient || metrics.length === 0) {
        return (
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    marginBottom: '1.5rem',
                    color: '#111827',
                }}>
                    Uptime Metrics
                </h2>
                <div style={{ 
                    display: 'grid', 
                    gap: '1rem',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                }}>
                    {services.map((service) => (
                        <div
                            key={service.id}
                            style={{
                                padding: '2rem',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '1rem',
                            }}
                        >
                            <div style={{ 
                                height: '100px', 
                                background: '#f3f4f6', 
                                borderRadius: '0.5rem',
                                animation: 'skeleton-pulse 1.5s ease-in-out infinite'
                            }} />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                marginBottom: '1.5rem',
                color: '#111827',
            }}>
                Uptime Metrics
            </h2>
            <div style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            }}>
                {metrics.map((metric) => (
                    <div
                        key={metric.service}
                        style={{
                            padding: '2rem',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '1rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <h3 style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: '700', 
                            marginBottom: '1.5rem',
                            color: '#111827',
                            letterSpacing: '-0.01em',
                        }}>
                            {metric.service}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* 30 Days */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                                        30 Days
                                    </span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                        {formatUptimePercent(metric.thirtyDays.uptime)}%
                                    </span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#e5e7eb',
                                    borderRadius: '0.375rem',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${metric.thirtyDays.uptime}%`,
                                        height: '100%',
                                        background: metric.thirtyDays.uptime >= 99.9 ? '#10b981' :
                                                   metric.thirtyDays.uptime >= 99 ? '#f59e0b' : '#ef4444',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                    {metric.thirtyDays.incidents} incident{metric.thirtyDays.incidents !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* 90 Days */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                                        90 Days
                                    </span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                        {formatUptimePercent(metric.ninetyDays.uptime)}%
                                    </span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#e5e7eb',
                                    borderRadius: '0.375rem',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${metric.ninetyDays.uptime}%`,
                                        height: '100%',
                                        background: metric.ninetyDays.uptime >= 99.9 ? '#10b981' :
                                                   metric.ninetyDays.uptime >= 99 ? '#f59e0b' : '#ef4444',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                    {metric.ninetyDays.incidents} incident{metric.ninetyDays.incidents !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

