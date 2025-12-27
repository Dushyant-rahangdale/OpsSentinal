'use client';

import { useMemo, useState } from 'react';
import { formatDateTime } from '@/lib/timezone';

type TimelineShift = {
    id: string;
    start: string;
    end: string;
    label: string;
    layerName: string;
    userName: string;
    source?: string;
};

type ScheduleTimelineProps = {
    shifts: TimelineShift[];
    timeZone: string;
    layers: Array<{ id: string; name: string }>;
};

export default function ScheduleTimeline({ shifts, timeZone, layers }: ScheduleTimelineProps) {
    const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState({ start: 0, end: 6 }); // Next 7 days

    const filteredShifts = useMemo(() => {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() + dateRange.start);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(now);
        endDate.setDate(now.getDate() + dateRange.end);
        endDate.setHours(23, 59, 59, 999);

        // First, filter by date range and layer
        const inRangeShifts = shifts
            .map(shift => ({
                ...shift,
                startDate: new Date(shift.start),
                endDate: new Date(shift.end)
            }))
            .filter(shift => {
                const inRange = shift.startDate < endDate && shift.endDate > startDate;
                const layerMatch = !selectedLayer || shift.layerName === selectedLayer;
                return inRange && layerMatch;
            });

        // Group by layer and date to show only one shift per layer per day
        const byLayerAndDay = new Map<string, TimelineShift & { startDate: Date; endDate: Date }>();

        inRangeShifts.forEach(shift => {
            // Create a key based on layer name and the day the shift starts
            const shiftStartDay = new Date(shift.startDate);
            shiftStartDay.setHours(0, 0, 0, 0);
            const dayKey = `${shift.layerName}-${shiftStartDay.toISOString().split('T')[0]}`;

            if (!byLayerAndDay.has(dayKey)) {
                byLayerAndDay.set(dayKey, shift);
            } else {
                const existing = byLayerAndDay.get(dayKey)!;
                // Prefer the shift that starts on this day (not a continuation from previous day)
                const shiftStartsOnDay = shift.startDate.getDate() === shiftStartDay.getDate() &&
                    shift.startDate.getMonth() === shiftStartDay.getMonth() &&
                    shift.startDate.getFullYear() === shiftStartDay.getFullYear();
                const existingStartsOnDay = existing.startDate.getDate() === shiftStartDay.getDate() &&
                    existing.startDate.getMonth() === shiftStartDay.getMonth() &&
                    existing.startDate.getFullYear() === shiftStartDay.getFullYear();

                if (shiftStartsOnDay && !existingStartsOnDay) {
                    byLayerAndDay.set(dayKey, shift);
                } else if (shiftStartsOnDay && existingStartsOnDay) {
                    // Both start on this day, prefer the one that starts earlier
                    if (shift.startDate < existing.startDate) {
                        byLayerAndDay.set(dayKey, shift);
                    }
                }
            }
        });

        return Array.from(byLayerAndDay.values())
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }, [shifts, selectedLayer, dateRange]);

    const timelineStart = useMemo(() => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() + dateRange.start);
        start.setHours(0, 0, 0, 0);
        return start;
    }, [dateRange.start]);

    const timelineEnd = useMemo(() => {
        const now = new Date();
        const end = new Date(now);
        end.setDate(now.getDate() + dateRange.end);
        end.setHours(23, 59, 59, 999);
        return end;
    }, [dateRange.end]);

    const getShiftPosition = (shift: typeof filteredShifts[0]) => {
        const totalMs = timelineEnd.getTime() - timelineStart.getTime();
        const shiftStartMs = shift.startDate.getTime() - timelineStart.getTime();
        const shiftDurationMs = shift.endDate.getTime() - shift.startDate.getTime();

        const left = Math.max(0, (shiftStartMs / totalMs) * 100);
        const width = Math.min(100, (shiftDurationMs / totalMs) * 100);

        return { left: `${left}%`, width: `${width}%` };
    };

    const layerColors = useMemo(() => {
        const colors = [
            { bg: '#e0f2fe', border: '#bae6fd', text: '#0c4a6e' },
            { bg: '#fef3c7', border: '#fde68a', text: '#78350f' },
            { bg: '#e9d5ff', border: '#d8b4fe', text: '#6b21a8' },
            { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46' },
            { bg: '#fee2e2', border: '#fecaca', text: '#991b1b' }
        ];

        const map = new Map<string, typeof colors[0]>();
        layers.forEach((layer, index) => {
            map.set(layer.name, colors[index % colors.length]);
        });
        return map;
    }, [layers]);
    const defaultLayerColor = { bg: '#e0f2fe', border: '#bae6fd', text: '#0c4a6e' };

    const formatTime = (date: Date) => {
        return formatDateTime(date, timeZone, { format: 'time', hour12: true });
    };

    const formatDate = (date: Date) => {
        return formatDateTime(date, timeZone, { format: 'short' }).split(',')[0] || formatDateTime(date, timeZone, { format: 'date' });
    };

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            marginBottom: '2rem'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <div>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        margin: 0,
                        marginBottom: '0.25rem'
                    }}>
                        Timeline View
                    </h3>
                    <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        margin: 0
                    }}>
                        Visual schedule showing all shifts over time
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                        value={selectedLayer || ''}
                        onChange={(e) => setSelectedLayer(e.target.value || null)}
                        style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.85rem',
                            background: 'white'
                        }}
                    >
                        <option value="">All Layers</option>
                        {layers.map(layer => (
                            <option key={layer.id} value={layer.name}>{layer.name}</option>
                        ))}
                    </select>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                            type="button"
                            onClick={() => setDateRange({ start: 0, end: 6 })}
                            className="glass-button"
                            style={{
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.85rem',
                                background: dateRange.end === 6 ? '#e0f2fe' : 'white'
                            }}
                        >
                            7 Days
                        </button>
                        <button
                            type="button"
                            onClick={() => setDateRange({ start: 0, end: 13 })}
                            className="glass-button"
                            style={{
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.85rem',
                                background: dateRange.end === 13 ? '#e0f2fe' : 'white'
                            }}
                        >
                            14 Days
                        </button>
                        <button
                            type="button"
                            onClick={() => setDateRange({ start: 0, end: 29 })}
                            className="glass-button"
                            style={{
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.85rem',
                                background: dateRange.end === 29 ? '#e0f2fe' : 'white'
                            }}
                        >
                            30 Days
                        </button>
                    </div>
                </div>
            </div>

            {filteredShifts.length === 0 ? (
                <div style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '8px'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                    <p style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-muted)',
                        margin: 0
                    }}>
                        No shifts found for the selected period.
                    </p>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    {/* Timeline Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                        padding: '0.5rem',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)'
                    }}>
                        <span>{formatDate(timelineStart)}</span>
                        <span>{formatDate(timelineEnd)}</span>
                    </div>

                    {/* Timeline Ruler */}
                    <div style={{
                        position: 'relative',
                        height: '2px',
                        background: '#e2e8f0',
                        marginBottom: '2rem'
                    }}>
                        {Array.from({ length: 8 }).map((_, i) => {
                            const date = new Date(timelineStart);
                            date.setDate(timelineStart.getDate() + (i * (dateRange.end - dateRange.start) / 7));
                            return (
                                <div
                                    key={i}
                                    style={{
                                        position: 'absolute',
                                        left: `${(i / 7) * 100}%`,
                                        top: '-6px',
                                        width: '2px',
                                        height: '14px',
                                        background: '#94a3b8'
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Shifts */}
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {filteredShifts.map(shift => {
                            const position = getShiftPosition(shift);
                            const colors = layerColors.get(shift.layerName) || layerColors.values().next().value || defaultLayerColor;
                            const isMultiDay = shift.startDate.toDateString() !== shift.endDate.toDateString();

                            return (
                                <div
                                    key={shift.id}
                                    style={{
                                        position: 'relative',
                                        padding: '0.75rem',
                                        background: colors.bg,
                                        border: `2px solid ${colors.border}`,
                                        borderRadius: '8px',
                                        minHeight: '60px'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '0.5rem',
                                        gap: '0.75rem',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: colors.border,
                                                color: colors.text,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {shift.layerName}
                                            </span>
                                            <span style={{
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                color: colors.text,
                                                wordBreak: 'break-word'
                                            }}>
                                                {shift.userName}
                                            </span>
                                            {shift.source === 'override' && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '0.15rem 0.4rem',
                                                    borderRadius: '4px',
                                                    background: '#fef3c7',
                                                    color: '#78350f',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    Override
                                                </span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: colors.text,
                                            opacity: 0.8,
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0
                                        }}>
                                            {formatTime(shift.startDate)} - {formatTime(shift.endDate)}
                                            {isMultiDay && (
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    marginTop: '0.25rem',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    ({formatDate(shift.startDate)} - {formatDate(shift.endDate)})
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Visual bar */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '0',
                                        left: position.left,
                                        width: position.width,
                                        height: '4px',
                                        background: colors.border,
                                        borderRadius: '2px'
                                    }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

