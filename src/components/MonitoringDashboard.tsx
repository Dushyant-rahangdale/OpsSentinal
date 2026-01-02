'use client';

import { logger } from '@/lib/logger';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface QueryStats {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    errorCount: number;
    queriesByType: Record<string, number>;
    distribution: Array<{ name: string; count: number }>;
}

interface QueryMetric {
    query: string;
    duration: number;
    timestamp: Date;
    params?: unknown;
    error?: Error;
}

interface MonitoringData {
    stats: QueryStats;
    slowQueries: QueryMetric[];
    recentErrors: QueryMetric[];
}

interface WebVitalsData {
    metrics: Array<{
        name: string;
        value: number;
        rating: string;
        url: string;
        timestamp: number;
    }>;
    aggregates: Record<string, {
        count: number;
        avg: number;
        min: number;
        max: number;
        ratings: { good: number; needsImprovement: number; poor: number };
    }>;
    total: number;
}

interface ServiceHealth {
    id: string;
    name: string;
    status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
    updatedAt: string;
    _count: {
        incidents: number;
    };
}

export default function MonitoringDashboard() {
    const [data, setData] = useState<MonitoringData | null>(null);
    const [webVitals, setWebVitals] = useState<WebVitalsData | null>(null);
    const [services, setServices] = useState<ServiceHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [webVitalsLoading, setWebVitalsLoading] = useState(false);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { userTimeZone } = useTimezone();
    const [timeWindow, setTimeWindow] = useState<number | undefined>(undefined);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (timeWindow) {
                params.set('timeWindow', timeWindow.toString());
            }
            params.set('limit', '10');

            const response = await fetch(`/api/monitoring/queries?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch monitoring data');
            }

            const result = await response.json();
            if (result.success) {
                setData(result.data);
                setError(null);
            } else {
                throw new Error(result.error || 'Failed to fetch data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchWebVitals = async () => {
        try {
            setWebVitalsLoading(true);
            const response = await fetch('/api/web-vitals?limit=50');
            if (!response.ok) {
                throw new Error('Failed to fetch Web Vitals');
            }
            const result = await response.json();
            setWebVitals(result);
        } catch (err) {
            // Silently fail for Web Vitals - it's optional
            logger.warn('Failed to fetch Web Vitals', { error: err });
        } finally {
            setWebVitalsLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            setServicesLoading(true);
            const response = await fetch('/api/monitoring/services');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setServices(result.data);
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                logger.error('Failed to fetch services', { error: error.message });
            } else {
                logger.error('Failed to fetch services', { error: String(error) });
            }
        } finally {
            setServicesLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchWebVitals();
        fetchServices();
        // Refresh every 30 seconds
        const interval = setInterval(() => {
            fetchData();
            fetchWebVitals();
            fetchServices();
        }, 30000);
        return () => clearInterval(interval);
    }, [timeWindow]);

    if (loading && !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Spinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Error: {error}</p>
                    <button
                        onClick={fetchData}
                        className="glass-button primary"
                    >
                        Retry
                    </button>
                </div>
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    const { stats, slowQueries, recentErrors } = data;

    return (
        <div>
            {/* Time Window Selector */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Time Window:</label>
                <select
                    value={timeWindow || 'all'}
                    onChange={(e) => {
                        const value = e.target.value;
                        setTimeWindow(value === 'all' ? undefined : parseInt(value, 10));
                    }}
                    style={{
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                    }}
                >
                    <option value="all">All Time</option>
                    <option value="3600000">Last Hour</option>
                    <option value="86400000">Last 24 Hours</option>
                    <option value="604800000">Last 7 Days</option>
                </select>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        fontSize: '0.9rem'
                    }}
                >
                    {loading ? <Spinner size="sm" /> : 'Refresh'}
                </button>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <Card>
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Total Queries
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {stats.totalQueries.toLocaleString()}
                        </div>
                    </div>
                </Card>

                <Card>
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Average Duration
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {stats.averageDuration.toFixed(2)}ms
                        </div>
                    </div>
                </Card>

                <Card>
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Slow Queries
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: stats.slowQueries > 0 ? 'var(--warning)' : 'var(--text-primary)'
                        }}>
                            {stats.slowQueries}
                        </div>
                    </div>
                </Card>

                <Card>
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Errors
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: stats.errorCount > 0 ? 'var(--danger)' : 'var(--text-primary)'
                        }}>
                            {stats.errorCount}
                        </div>
                    </div>
                </Card>
            </div>


            {/* Service Health Section */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Service Health
                </h3>
                {servicesLoading && services.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <Spinner size="md" />
                    </div>
                ) : services.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {services.map(service => {
                            const getStatusColor = (status: string) => {
                                switch (status) {
                                    case 'OPERATIONAL': return 'var(--success)';
                                    case 'DEGRADED': return 'var(--warning)';
                                    case 'MAINTENANCE': return 'var(--info)';
                                    default: return 'var(--danger)';
                                }
                            };
                            return (
                                <Card key={service.id}>
                                    <div style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                            <h4 style={{ fontWeight: '600', fontSize: '1rem' }}>{service.name}</h4>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '999px',
                                                backgroundColor: `${getStatusColor(service.status)}20`,
                                                color: getStatusColor(service.status),
                                                fontWeight: '600'
                                            }}>
                                                {service.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {service._count.incidents > 0 ? (
                                                <span style={{ color: 'var(--danger)' }}>
                                                    {service._count.incidents} open incident{service._count.incidents !== 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--success)' }}>No open incidents</span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card>
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No services monitored.
                        </div>
                    </Card>
                )}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                {/* Duration Distribution Chart */}
                <Card>
                    <div style={{ padding: '1.5rem', height: '100%' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                            Query Latency Distribution
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.distribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tick={{ fill: 'var(--text-muted)' }} />
                                    <YAxis fontSize={12} tick={{ fill: 'var(--text-muted)' }} allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--color-neutral-100)' }}
                                        contentStyle={{ borderRadius: '6px', border: '1px solid var(--border)' }}
                                    />
                                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Queries" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </Card>

                {/* Web Vitals Chart */}
                {webVitals && (
                    <Card>
                        <div style={{ padding: '1.5rem', height: '100%' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                                Core Web Vitals (Average)
                            </h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(webVitals.aggregates).map(([name, agg]) => ({
                                            name,
                                            value: agg.avg,
                                            rating: agg.avg < 100 ? 'good' : agg.avg < 300 ? 'needsImprovement' : 'poor' // Simplified check
                                        }))}
                                        layout="vertical"
                                        margin={{ left: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" fontSize={12} tick={{ fill: 'var(--text-muted)' }} unit="ms" />
                                        <YAxis dataKey="name" type="category" fontSize={12} tick={{ fill: 'var(--text-muted)' }} width={50} />
                                        <Tooltip
                                            cursor={{ fill: 'var(--color-neutral-100)' }}
                                            contentStyle={{ borderRadius: '6px', border: '1px solid var(--border)' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Avg Duration (ms)">
                                            {
                                                Object.entries(webVitals.aggregates).map((entry, index) => {
                                                    const rating = entry[1].ratings.poor > entry[1].ratings.good ? 'poor' : 'good';
                                                    // Simple color logic for demo
                                                    return <Cell key={`cell-${index}`} fill={rating === 'good' ? '#16a34a' : '#ef4444'} />;
                                                })
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Queries by Type */}
            <Card style={{ marginBottom: '2rem' }}>

                <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                        Queries by Type
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        {Object.entries(stats.queriesByType).map(([type, count]) => (
                            <div key={type} style={{
                                padding: '1rem',
                                background: 'var(--color-neutral-50)',
                                borderRadius: '6px',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    {type}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                    {count.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Slow Queries */}
            {slowQueries.length > 0 && (
                <Card style={{ marginBottom: '2rem' }}>
                    <div style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                            Slow Queries ({slowQueries.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {slowQueries.map((query, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '1rem',
                                        background: 'var(--color-neutral-50)',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: '600', color: 'var(--warning)' }}>
                                            {query.duration}ms
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            {formatDateTime(query.timestamp, userTimeZone, { format: 'datetime' })}
                                        </span>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                        {query.query}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Recent Errors */}
            {recentErrors.length > 0 && (
                <Card>
                    <div style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--danger)' }}>
                            Recent Errors ({recentErrors.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {recentErrors.map((error, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '1rem',
                                        background: '#fee2e2',
                                        borderRadius: '6px',
                                        border: '1px solid #fecaca'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: '600', color: 'var(--danger)' }}>
                                            {error.error?.message || 'Unknown error'}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            {formatDateTime(error.timestamp, userTimeZone, { format: 'datetime' })}
                                        </span>
                                    </div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                        {error.query}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {slowQueries.length === 0 && recentErrors.length === 0 && (
                <Card>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No slow queries or errors to display</p>
                    </div>
                </Card>
            )}

            {/* Web Vitals Section */}
            <Card style={{ marginTop: '2rem' }}>
                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                            Web Vitals Performance
                        </h3>
                        <button
                            onClick={fetchWebVitals}
                            disabled={webVitalsLoading}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: webVitalsLoading ? 'not-allowed' : 'pointer',
                                opacity: webVitalsLoading ? 0.6 : 1,
                                fontSize: '0.9rem'
                            }}
                        >
                            {webVitalsLoading ? <Spinner size="sm" /> : 'Refresh'}
                        </button>
                    </div>

                    {webVitalsLoading && !webVitals ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                            <Spinner size="md" />
                        </div>
                    ) : webVitals && Object.keys(webVitals.aggregates).length > 0 ? (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                {Object.entries(webVitals.aggregates).map(([name, agg]) => {
                                    const getRatingColor = (rating: string) => {
                                        if (rating === 'good') return '#16a34a';
                                        if (rating === 'needsImprovement') return '#f59e0b';
                                        return '#dc2626';
                                    };

                                    const getRatingLabel = (name: string) => {
                                        const labels: Record<string, string> = {
                                            CLS: 'Cumulative Layout Shift',
                                            FID: 'First Input Delay',
                                            FCP: 'First Contentful Paint',
                                            LCP: 'Largest Contentful Paint',
                                            TTFB: 'Time to First Byte',
                                            INP: 'Interaction to Next Paint',
                                        };
                                        return labels[name] || name;
                                    };

                                    const formatValue = (name: string, value: number) => {
                                        if (name === 'CLS') return value.toFixed(3);
                                        return `${Math.round(value)}ms`;
                                    };

                                    const goodPercentage = agg.count > 0
                                        ? ((agg.ratings.good / agg.count) * 100).toFixed(1)
                                        : '0';

                                    return (
                                        <div
                                            key={name}
                                            style={{
                                                padding: '1rem',
                                                background: 'var(--color-neutral-50)',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)'
                                            }}
                                        >
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '600' }}>
                                                {getRatingLabel(name)}
                                            </div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                                                {formatValue(name, agg.avg)}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                Avg: {formatValue(name, agg.avg)} | Min: {formatValue(name, agg.min)} | Max: {formatValue(name, agg.max)}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                                                <span style={{ color: getRatingColor('good') }}>
                                                    ✓ {agg.ratings.good} good
                                                </span>
                                                <span style={{ color: getRatingColor('needsImprovement') }}>
                                                    ⚠ {agg.ratings.needsImprovement} needs improvement
                                                </span>
                                                <span style={{ color: getRatingColor('poor') }}>
                                                    ✗ {agg.ratings.poor} poor
                                                </span>
                                            </div>
                                            <div style={{
                                                marginTop: '0.5rem',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-muted)'
                                            }}>
                                                {goodPercentage}% good ({agg.count} samples)
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {webVitals.total > 0 && (
                                <div style={{
                                    padding: '0.75rem',
                                    background: 'var(--color-neutral-100)',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)'
                                }}>
                                    Total metrics collected: {webVitals.total.toLocaleString()}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <p>No Web Vitals data available yet. Metrics will appear as users interact with the application.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

