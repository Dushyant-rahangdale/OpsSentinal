'use client';

import { useEffect, useState } from 'react';
import Card from './ui/Card';
import Spinner from './ui/Spinner';

interface QueryStats {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    errorCount: number;
    queriesByType: Record<string, number>;
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

export default function MonitoringDashboard() {
    const [data, setData] = useState<MonitoringData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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

    useEffect(() => {
        fetchData();
        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
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
                                            {new Date(query.timestamp).toLocaleString()}
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
                                            {new Date(error.timestamp).toLocaleString()}
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
        </div>
    );
}

