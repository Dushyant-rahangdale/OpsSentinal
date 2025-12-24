'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateTime, getBrowserTimeZone } from '@/lib/timezone';

interface Service {
    id: string;
    name: string;
    status: string;
    _count: {
        incidents: number;
    };
}

interface StatusPageService {
    id: string;
    serviceId: string;
    displayName?: string | null;
    showOnPage: boolean;
}

interface StatusPageServicesProps {
    services: Service[];
    statusPageServices: StatusPageService[];
    uptime90: Record<string, number>;
    incidents: Array<{
        serviceId: string;
        createdAt: string;
        resolvedAt?: string | null;
        status: string;
        urgency: string;
    }>;
}

const STATUS_CONFIG = {
    OPERATIONAL: {
        color: '#16a34a',
        label: 'Operational',
        background: '#dcfce7',
        border: '#86efac',
    },
    DEGRADED: {
        color: '#d97706',
        label: 'Degraded',
        background: '#fef3c7',
        border: '#fcd34d',
    },
    PARTIAL_OUTAGE: {
        color: '#d97706',
        label: 'Partial Outage',
        background: '#fef3c7',
        border: '#fcd34d',
    },
    MAJOR_OUTAGE: {
        color: '#dc2626',
        label: 'Major Outage',
        background: '#fee2e2',
        border: '#fca5a5',
    },
    MAINTENANCE: {
        color: '#2563eb',
        label: 'Maintenance',
        background: '#dbeafe',
        border: '#93c5fd',
    },
};

const HISTORY_STATUS_COLORS: Record<'operational' | 'degraded' | 'outage' | 'future', string> = {
    operational: '#16a34a', // Brighter, more visible green
    degraded: '#d97706', // Brighter, more visible orange/yellow
    outage: '#dc2626', // Brighter, more visible red
    future: '#cbd5e1', // Slightly darker grey for better visibility
};

type HoveredBar = {
    serviceId: string;
    date: string;
    left: number;
    width: number;
};

type TimelineSliceStatus = 'operational' | 'degraded' | 'outage' | 'future';

type TimelineData = {
    date: string;
    status: TimelineSliceStatus[];
};

export default function StatusPageServices({ services, statusPageServices, uptime90, incidents }: StatusPageServicesProps) {
    const [hoveredBar, setHoveredBar] = useState<HoveredBar | null>(null);
    const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null);
    const [visibleDays, setVisibleDays] = useState(90);
    const timelineCache = useRef(new Map<string, TimelineData>());
    const now = useMemo(() => new Date(), []);
    const daysToShow = 90;

    useEffect(() => {
        const updateVisibleDays = () => {
            const width = window.innerWidth;
            if (width < 1024) {
                setVisibleDays(30);
            } else if (width < 1440) {
                setVisibleDays(60);
            } else {
                setVisibleDays(90);
            }
        };

        updateVisibleDays();
        window.addEventListener('resize', updateVisibleDays);
        return () => window.removeEventListener('resize', updateVisibleDays);
    }, []);

    const incidentsByService = useMemo(() => {
        const map: Record<string, Array<{
            createdAt: Date;
            resolvedAt?: Date | null;
            status: string;
            urgency: string;
        }>> = {};

        incidents.forEach((incident) => {
            if (!map[incident.serviceId]) {
                map[incident.serviceId] = [];
            }

            map[incident.serviceId].push({
                createdAt: new Date(incident.createdAt),
                resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : null,
                status: incident.status,
                urgency: incident.urgency,
            });
        });

        return map;
    }, [incidents]);

    const historyByService = useMemo(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (daysToShow - 1));

        const historyMap: Record<string, Array<{ date: string; status: 'operational' | 'degraded' | 'outage' }>> = {};
        services.forEach((service) => {
            historyMap[service.id] = [];
        });

        for (let i = 0; i < daysToShow; i += 1) {
            const dayStart = new Date(start);
            dayStart.setDate(start.getDate() + i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);
            const dayKey = formatLocalDateKey(dayStart);

            services.forEach((service) => {
                const active = (incidentsByService[service.id] || []).filter((incident) => {
                    if (incident.status === 'SUPPRESSED' || incident.status === 'SNOOZED') {
                        return false;
                    }
                    const incidentEnd = incident.resolvedAt || now;
                    return incident.createdAt < dayEnd && incidentEnd >= dayStart;
                });

                const hasOutage = active.some((incident) => incident.urgency === 'HIGH');
                const hasDegraded = active.some((incident) => incident.urgency === 'LOW');
                const status = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

                historyMap[service.id].push({
                    date: dayKey,
                    status,
                });
            });
        }

        return historyMap;
    }, [services, incidentsByService, now]);

    const getTimelineData = (serviceId: string, date: string): TimelineData => {
        const cacheKey = `${serviceId}-${date}`;
        const cached = timelineCache.current.get(cacheKey);
        if (cached) {
            return cached;
        }

        const [year, month, day] = date.split('-').map(Number);
        const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
        const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

        const slices: TimelineSliceStatus[] = new Array(144).fill('operational');
        const relevantIncidents = (incidentsByService[serviceId] || []).filter((incident) => {
            if (incident.status === 'SUPPRESSED' || incident.status === 'SNOOZED') {
                return false;
            }
            const incidentEnd = incident.resolvedAt || now;
            return incident.createdAt < dayEnd && incidentEnd > dayStart;
        });

        const severityRank: Record<TimelineSliceStatus, number> = {
            operational: 0,
            degraded: 1,
            outage: 2,
            future: -1,
        };

        relevantIncidents.forEach((incident) => {
            const incidentStart = incident.createdAt > dayStart ? incident.createdAt : dayStart;
            const incidentEnd = (incident.resolvedAt || now) < dayEnd ? (incident.resolvedAt || now) : dayEnd;
            const startIndex = Math.floor((incidentStart.getTime() - dayStart.getTime()) / (10 * 60 * 1000));
            const endIndex = Math.ceil((incidentEnd.getTime() - dayStart.getTime()) / (10 * 60 * 1000)) - 1;

            const statusForIncident: TimelineSliceStatus = incident.urgency === 'HIGH'
                ? 'outage'
                : incident.urgency === 'LOW'
                    ? 'degraded'
                    : 'operational';

            for (let i = Math.max(0, startIndex); i <= Math.min(143, endIndex); i += 1) {
                if (severityRank[statusForIncident] > severityRank[slices[i]]) {
                    slices[i] = statusForIncident;
                }
            }
        });

        const isToday = dayStart.toDateString() === now.toDateString();
        if (isToday) {
            const currentIndex = Math.floor((now.getTime() - dayStart.getTime()) / (10 * 60 * 1000));
            for (let i = Math.max(0, currentIndex + 1); i < slices.length; i += 1) {
                slices[i] = 'future';
            }
        }

        const timeline = { date, status: slices };
        timelineCache.current.set(cacheKey, timeline);
        return timeline;
    };

    const getIncidentStartMarkers = (serviceId: string, date: string) => {
        const [year, month, day] = date.split('-').map(Number);
        const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
        const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

        const markerMap = new Map<number, string>();
        const times: string[] = [];
        (incidentsByService[serviceId] || []).forEach((incident) => {
            if (incident.status === 'SUPPRESSED' || incident.status === 'SNOOZED') {
                return;
            }
            if (incident.resolvedAt) {
                return;
            }
            if (incident.createdAt < dayStart || incident.createdAt >= dayEnd) {
                return;
            }
            const index = Math.floor((incident.createdAt.getTime() - dayStart.getTime()) / (10 * 60 * 1000));
            const browserTz = getBrowserTimeZone();
            const label = formatDateTime(incident.createdAt, browserTz, { format: 'time', hour12: false });
            markerMap.set(Math.max(0, Math.min(143, index)), label);
            times.push(label);
        });

        return {
            markers: Array.from(markerMap.entries()).map(([index, label]) => ({ index, label })),
            times: times.sort(),
        };
    };

    const formatTooltipDate = (dateKey: string) => {
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day, 0, 0, 0, 0);
        return formatDateTime(date, getBrowserTimeZone(), { format: 'date' });
    };
    // If statusPageServices is empty, show all services
    // Otherwise, only show configured services
    let visibleServices: any[] = [];

    if (statusPageServices.length === 0) {
        // No services configured, show all services
        visibleServices = services.map(service => ({
            ...service,
            displayName: service.name,
        }));
    } else {
        // Show only configured services
        visibleServices = statusPageServices
            .filter(sp => sp.showOnPage)
            .map(sp => {
                const service = services.find(s => s.id === sp.serviceId);
                if (!service) return null;
                return {
                    ...service,
                    displayName: sp.displayName || service.name,
                };
            })
            .filter(Boolean);
    }

    if (visibleServices.length === 0) return null;

    return (
        <section style={{ marginBottom: '4rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                gap: '1rem',
                flexWrap: 'wrap',
            }}>
                <div>
                    <h2 style={{
                        fontSize: '1.875rem',
                        fontWeight: '800',
                        color: '#0f172a',
                        margin: 0,
                        marginBottom: '0.25rem',
                        letterSpacing: '-0.02em',
                    }}>
                        Services
                    </h2>
                    <p style={{ 
                        fontSize: '0.875rem', 
                        color: '#64748b',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Last {visibleDays} days
                    </p>
                </div>
            </div>
            <div style={{
                display: 'flex',
                gap: '1.25rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '1.5rem',
                padding: '1rem 1.25rem',
                background: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
            }}>
                <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#475569',
                    fontWeight: '500',
                }}>
                    <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '3px', 
                        background: HISTORY_STATUS_COLORS.operational,
                        boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)',
                    }} />
                    Operational
                </span>
                <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#475569',
                    fontWeight: '500',
                }}>
                    <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '3px', 
                        background: HISTORY_STATUS_COLORS.degraded,
                        boxShadow: '0 2px 4px rgba(251, 191, 36, 0.3)',
                    }} />
                    Degraded
                </span>
                <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#475569',
                    fontWeight: '500',
                }}>
                    <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '3px', 
                        background: HISTORY_STATUS_COLORS.outage,
                        boxShadow: '0 2px 4px rgba(248, 113, 113, 0.3)',
                    }} />
                    Outage
                </span>
            </div>
            <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                background: '#ffffff',
                overflow: 'visible',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                position: 'relative',
            }}>
                {visibleServices.map((service: any, index: number) => {
                    const serviceStatus = service.status || 'OPERATIONAL';
                    const statusConfig = STATUS_CONFIG[serviceStatus as keyof typeof STATUS_CONFIG] || {
                        color: '#475569',
                        label: 'Unknown',
                        background: '#f1f5f9',
                        border: '#cbd5e1',
                    };
                    const activeIncidents = service._count.incidents;
                    const serviceHistory = historyByService[service.id] || [];
                    const displayedHistory = serviceHistory.slice(-visibleDays);
                    const uptimeValue90 = uptime90[service.id];
                    const hoveredTimeline = hoveredBar && hoveredBar.serviceId === service.id
                        ? getTimelineData(service.id, hoveredBar.date)
                        : null;
                    const hoveredMarkerData = hoveredBar && hoveredBar.serviceId === service.id
                        ? getIncidentStartMarkers(service.id, hoveredBar.date)
                        : { markers: [], times: [] };
                    const isRowHovered = hoveredServiceId === service.id;
                    const isTooltipActive = hoveredBar?.serviceId === service.id;

                    return (
                        <div
                            key={service.id}
                            className="status-service-card"
                            data-service-row="true"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                padding: '1.5rem 1.5rem',
                                borderTop: index === 0 ? 'none' : '1px solid #e2e8f0',
                                position: 'relative',
                                background: isRowHovered 
                                    ? `linear-gradient(90deg, ${statusConfig.background}08 0%, #ffffff 100%)` 
                                    : '#ffffff',
                                borderLeft: `4px solid ${isRowHovered ? statusConfig.color : 'transparent'}`,
                                transition: 'all 0.2s ease',
                                transform: isRowHovered ? 'translateX(2px)' : 'none',
                                overflow: 'visible',
                                zIndex: isTooltipActive ? 30 : isRowHovered ? 10 : 1,
                            }}
                            onMouseEnter={() => setHoveredServiceId(service.id)}
                            onMouseLeave={(e) => {
                                const relatedTarget = e.relatedTarget as HTMLElement | null;
                                if (relatedTarget && relatedTarget.closest('[data-tooltip]')) {
                                    return;
                                }
                                setHoveredServiceId((current) => (current === service.id ? null : current));
                                setHoveredBar((current) => (current && current.serviceId === service.id ? null : current));
                            }}
                        >
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                gap: '1.5rem', 
                                alignItems: 'flex-start' 
                            }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{
                                        fontSize: '1.125rem',
                                        fontWeight: '700',
                                        color: '#0f172a',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        marginBottom: '0.5rem',
                                        letterSpacing: '-0.01em',
                                    }}>
                                        {service.displayName}
                                    </div>
                                    {activeIncidents > 0 && (
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.8125rem',
                                            color: '#dc2626',
                                            fontWeight: '600',
                                            padding: '0.25rem 0.625rem',
                                            background: '#fee2e2',
                                            borderRadius: '0.375rem',
                                            border: '1px solid #fecaca',
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            {activeIncidents} active incident{activeIncidents !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'flex-end', 
                                    gap: '0.5rem',
                                    flexShrink: 0,
                                }}>
                                    <span style={{
                                        padding: '0.375rem 0.875rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        color: statusConfig.color,
                                        background: statusConfig.background,
                                        border: `2px solid ${statusConfig.border}`,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        whiteSpace: 'nowrap',
                                        boxShadow: `0 2px 4px ${statusConfig.border}30`,
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                        e.currentTarget.style.boxShadow = `0 4px 8px ${statusConfig.border}50`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = `0 2px 4px ${statusConfig.border}30`;
                                    }}
                                    >
                                        {statusConfig.label}
                                    </span>
                                    {uptimeValue90 !== undefined && (
                                        <div style={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            fontSize: '0.8125rem', 
                                            color: '#64748b',
                                            fontWeight: '500',
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                            </svg>
                                            <span>{uptimeValue90.toFixed(2)}% uptime (90d)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${displayedHistory.length || visibleDays}, minmax(0, 1fr))`,
                                gap: '2px',
                                height: '20px',
                                padding: '0.45rem 0.65rem',
                                alignItems: 'center',
                                width: '100%',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                borderRadius: '0.65rem',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.05)',
                            }}>
                                {(displayedHistory.length ? displayedHistory : new Array(visibleDays).fill(null)).map((entry, barIndex) => {
                                    const barStatus = entry?.status || 'operational';
                                    const isHovered = hoveredBar?.serviceId === service.id && hoveredBar?.date === entry?.date;

                                    return (
                                        <div
                                            key={`${service.id}-${barIndex}`}
                                            style={{
                                                position: 'relative',
                                                height: '100%',
                                                background: HISTORY_STATUS_COLORS[barStatus as 'operational' | 'degraded' | 'outage'],
                                                borderRadius: '2px',
                                                boxShadow: isHovered ? '0 0 0 1px #0f172a' : 'none',
                                                cursor: entry ? 'pointer' : 'default',
                                                transition: 'all 0.15s ease',
                                                border: isHovered ? '1px solid #0f172a' : '1px solid transparent',
                                            }}
                                            onMouseEnter={(event) => {
                                                if (entry) {
                                                    const barRect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                                                    const rowElement = (event.currentTarget as HTMLDivElement).closest('[data-service-row]');
                                                    const rowRect = rowElement ? rowElement.getBoundingClientRect() : barRect;
                                                    const tooltipWidth = Math.max(600, Math.min(1100, rowRect.width - 16));
                                                    const center = barRect.left - rowRect.left + barRect.width / 2;
                                                    const half = tooltipWidth / 2;
                                                    const padding = 12;
                                                    const clamped = Math.max(half + padding, Math.min(rowRect.width - half - padding, center));

                                                    setHoveredBar({
                                                        serviceId: service.id,
                                                        date: entry.date,
                                                        left: clamped,
                                                        width: tooltipWidth,
                                                    });
                                                }
                                            }}
                                            onMouseLeave={(event) => {
                                                const relatedTarget = (event as any).relatedTarget as HTMLElement | null;
                                                if (relatedTarget && relatedTarget.closest('[data-tooltip]')) {
                                                    return;
                                                }
                                                setHoveredBar((current) =>
                                                    current?.serviceId === service.id && current?.date === entry?.date ? null : current
                                                );
                                            }}
                                            onClick={(event) => {
                                                if (!entry) return;
                                                const barRect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                                                const rowElement = (event.currentTarget as HTMLDivElement).closest('[data-service-row]');
                                                const rowRect = rowElement ? rowElement.getBoundingClientRect() : barRect;
                                                const tooltipWidth = Math.max(600, Math.min(1100, rowRect.width - 16));
                                                const center = barRect.left - rowRect.left + barRect.width / 2;
                                                const half = tooltipWidth / 2;
                                                const padding = 12;
                                                const clamped = Math.max(half + padding, Math.min(rowRect.width - half - padding, center));

                                                setHoveredBar((current) => {
                                                    if (current && current.serviceId === service.id && current.date === entry.date) {
                                                        return null;
                                                    }
                                                    return {
                                                        serviceId: service.id,
                                                        date: entry.date,
                                                        left: clamped,
                                                        width: tooltipWidth,
                                                    };
                                                });
                                            }}
                                            onTouchStart={(event) => {
                                                if (!entry) return;
                                                const barRect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                                                const rowElement = (event.currentTarget as HTMLDivElement).closest('[data-service-row]');
                                                const rowRect = rowElement ? rowElement.getBoundingClientRect() : barRect;
                                                const tooltipWidth = Math.max(600, Math.min(1100, rowRect.width - 16));
                                                const center = barRect.left - rowRect.left + barRect.width / 2;
                                                const half = tooltipWidth / 2;
                                                const padding = 12;
                                                const clamped = Math.max(half + padding, Math.min(rowRect.width - half - padding, center));

                                                setHoveredBar((current) => {
                                                    if (current && current.serviceId === service.id && current.date === entry.date) {
                                                        return null;
                                                    }
                                                    return {
                                                        serviceId: service.id,
                                                        date: entry.date,
                                                        left: clamped,
                                                        width: tooltipWidth,
                                                    };
                                                });
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            {hoveredBar && hoveredBar.serviceId === service.id && (() => {
                                const tooltipEntry = displayedHistory.find(e => e.date === hoveredBar.date);
                                const dayStatus = tooltipEntry?.status || 'operational';
                                const slaMetrics = hoveredTimeline
                                    ? hoveredTimeline.status.reduce(
                                        (acc, status) => {
                                            if (status !== 'future') {
                                                acc.total += 1;
                                                if (status === 'operational') {
                                                    acc.operational += 1;
                                                }
                                            }
                                            return acc;
                                        },
                                        { total: 0, operational: 0 }
                                    )
                                    : { total: 0, operational: 0 };
                                const slaValue = slaMetrics.total > 0 ? (slaMetrics.operational / slaMetrics.total) * 100 : 100;
                                return (
                                <div 
                                    data-tooltip="true"
                                    style={{
                                        position: 'absolute',
                                        left: `${hoveredBar.left}px`,
                                        top: '100%',
                                        marginTop: '0.75rem',
                                        background: '#ffffff',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '1rem',
                                        padding: '1.25rem',
                                        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                                        zIndex: 100,
                                        width: `${hoveredBar.width}px`,
                                        maxWidth: '98vw',
                                        transform: 'translateX(-50%)',
                                        opacity: 1,
                                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                                        overflow: 'hidden',
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredBar(null);
                                    }}
                                >
                                    <span style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        left: '50%',
                                        width: '10px',
                                        height: '10px',
                                        background: '#ffffff',
                                        borderLeft: '1px solid #e2e8f0',
                                        borderTop: '1px solid #e2e8f0',
                                        transform: 'translateX(-50%) rotate(45deg)',
                                    }} />
                                    <button
                                        type="button"
                                        aria-label="Close"
                                        onClick={() => setHoveredBar(null)}
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            border: 'none',
                                            background: '#f1f5f9',
                                            color: '#64748b',
                                            fontSize: '1.125rem',
                                            cursor: 'pointer',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#e2e8f0';
                                            e.currentTarget.style.color = '#475569';
                                            e.currentTarget.style.transform = 'scale(1.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#f1f5f9';
                                            e.currentTarget.style.color = '#64748b';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                    >
                                        x
                                    </button>
                                    <div style={{ 
                                        fontSize: '1rem', 
                                        fontWeight: '700', 
                                        color: '#0f172a', 
                                        marginBottom: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        flexWrap: 'wrap',
                                    }}>
                                        <span>{formatTooltipDate(hoveredBar.date)}</span>
                                        {tooltipEntry && (
                                            <span style={{
                                                padding: '0.375rem 0.75rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                background: HISTORY_STATUS_COLORS[dayStatus as 'operational' | 'degraded' | 'outage'] + '20',
                                                color: HISTORY_STATUS_COLORS[dayStatus as 'operational' | 'degraded' | 'outage'],
                                                border: `2px solid ${HISTORY_STATUS_COLORS[dayStatus as 'operational' | 'degraded' | 'outage']}60`,
                                                boxShadow: `0 2px 4px ${HISTORY_STATUS_COLORS[dayStatus as 'operational' | 'degraded' | 'outage']}30`,
                                            }}>
                                                {dayStatus === 'operational' ? 'Operational' : dayStatus === 'degraded' ? 'Degraded' : 'Outage'}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.35rem' }}>
                                        {service.displayName} - Local time
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem' }}>
                                        SLA: {slaValue.toFixed(2)}% met
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.75rem',
                                        flexWrap: 'wrap',
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        marginBottom: '1rem',
                                        padding: '0.75rem',
                                        background: '#f8fafc',
                                        borderRadius: '0.5rem',
                                    }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: HISTORY_STATUS_COLORS.operational, boxShadow: `0 0 0 2px ${HISTORY_STATUS_COLORS.operational}30` }} />
                                            Operational
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: HISTORY_STATUS_COLORS.degraded, boxShadow: `0 0 0 2px ${HISTORY_STATUS_COLORS.degraded}30` }} />
                                            Degraded
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: HISTORY_STATUS_COLORS.outage, boxShadow: `0 0 0 2px ${HISTORY_STATUS_COLORS.outage}30` }} />
                                            Outage
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: HISTORY_STATUS_COLORS.future, boxShadow: `0 0 0 2px ${HISTORY_STATUS_COLORS.future}30` }} />
                                            Upcoming
                                        </span>
                                    </div>
                                    {hoveredTimeline && (
                                        <div>
                                            <div style={{
                                                position: 'relative',
                                                width: '100%',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '0',
                                                    height: '52px',
                                                    padding: '0.2rem 0.2rem',
                                                    background: '#f8fafc',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid #e2e8f0',
                                                    boxSizing: 'border-box',
                                                }}>
                                                    {hoveredTimeline.status.map((sliceStatus, sliceIndex) => (
                                                        <div
                                                            key={`${service.id}-${hoveredBar.date}-${sliceIndex}`}
                                                            style={(() => {
                                                                const sliceColor = HISTORY_STATUS_COLORS[sliceStatus] || HISTORY_STATUS_COLORS.operational;
                                                                return {
                                                                    flex: '1 1 0',
                                                                    background: sliceColor,
                                                                    borderRadius: '0',
                                                                    height: '100%',
                                                                    minHeight: '100%',
                                                                    minWidth: '3px',
                                                                    boxShadow: 'none',
                                                                };
                                                            })()}
                                                        />
                                                    ))}
                                                </div>
                                                {hoveredMarkerData.markers.map((marker) => (
                                                    <span
                                                        key={`${service.id}-${hoveredBar.date}-marker-${marker.index}`}
                                                        title={marker.label}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '0',
                                                            left: `${(marker.index / 144) * 100}%`,
                                                            width: '2px',
                                                            height: '100%',
                                                            background: '#0f172a',
                                                            opacity: 0.7,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            {hoveredMarkerData.times.length > 0 && (
                                                <div style={{
                                                    marginTop: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    color: '#64748b',
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '0.4rem',
                                                }}>
                                                    <span style={{ fontWeight: '600', color: '#475569' }}>Starts:</span>
                                                    {hoveredMarkerData.times.map((time, timeIndex) => (
                                                        <span key={`${service.id}-${hoveredBar.date}-time-${timeIndex}`} style={{
                                                            padding: '0.15rem 0.4rem',
                                                            borderRadius: '0.4rem',
                                                            background: '#f1f5f9',
                                                        }}>
                                                            {time}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.7rem',
                                                color: '#94a3b8',
                                                marginTop: '0.35rem',
                                            }}>
                                                <span>00:00</span>
                                                <span>06:00</span>
                                                <span>12:00</span>
                                                <span>18:00</span>
                                                <span>24:00</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function formatLocalDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
