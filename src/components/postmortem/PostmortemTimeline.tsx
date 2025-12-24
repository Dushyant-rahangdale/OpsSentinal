'use client';

import type { TimelineEvent } from './PostmortemTimelineBuilder';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
export type { TimelineEvent };

interface PostmortemTimelineProps {
    events: TimelineEvent[];
    incidentStartTime?: Date;
    incidentEndTime?: Date;
}

const EVENT_TYPE_COLORS = {
    DETECTION: '#3b82f6',
    ESCALATION: '#f59e0b',
    MITIGATION: '#8b5cf6',
    RESOLUTION: '#22c55e',
};

const EVENT_TYPE_LABELS = {
    DETECTION: 'Detection',
    ESCALATION: 'Escalation',
    MITIGATION: 'Mitigation',
    RESOLUTION: 'Resolution',
};

const EVENT_TYPE_ICONS = {
    DETECTION: '🔍',
    ESCALATION: '📢',
    MITIGATION: '🔧',
    RESOLUTION: '✅',
};

export default function PostmortemTimeline({ events, incidentStartTime, incidentEndTime }: PostmortemTimelineProps) {
    const { userTimeZone } = useTimezone();
    
    if (!events || events.length === 0) {
        return (
            <div style={{ 
                padding: 'var(--spacing-8)', 
                textAlign: 'center',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
            }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-base)' }}>
                    No timeline events recorded
                </p>
            </div>
        );
    }

    const sortedEvents = [...events].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startTime = incidentStartTime || new Date(sortedEvents[0].timestamp);
    const endTime = incidentEndTime || new Date(sortedEvents[sortedEvents.length - 1].timestamp);
    const totalDuration = endTime.getTime() - startTime.getTime();

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    return (
        <div style={{ 
            padding: 'var(--spacing-6)', 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
            <div style={{ marginBottom: 'var(--spacing-4)' }}>
                <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-2)' }}>
                    Incident Timeline
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    Total duration: {formatDuration(totalDuration)}
                </p>
            </div>

            <div style={{ position: 'relative', paddingLeft: 'var(--spacing-6)' }}>
                {/* Timeline line */}
                <div style={{
                    position: 'absolute',
                    left: '1.5rem',
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: 'linear-gradient(180deg, #3b82f6 0%, #22c55e 100%)',
                    borderRadius: 'var(--radius-sm)',
                }} />

                {sortedEvents.map((event, index) => {
                    const eventTime = new Date(event.timestamp);
                    const position = totalDuration > 0 
                        ? ((eventTime.getTime() - startTime.getTime()) / totalDuration) * 100 
                        : 0;

                    return (
                        <div
                            key={event.id}
                            style={{
                                position: 'relative',
                                marginBottom: index < sortedEvents.length - 1 ? 'var(--spacing-6)' : 0,
                            }}
                        >
                            {/* Event marker */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '-1.75rem',
                                    top: '0.5rem',
                                    width: '2rem',
                                    height: '2rem',
                                    borderRadius: '50%',
                                    background: EVENT_TYPE_COLORS[event.type],
                                    border: '3px solid white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.875rem',
                                    zIndex: 1,
                                }}
                            >
                                {EVENT_TYPE_ICONS[event.type]}
                            </div>

                            {/* Event card */}
                            <div
                                style={{
                                    marginLeft: 'var(--spacing-4)',
                                    padding: 'var(--spacing-4)',
                                    background: 'white',
                                    border: `2px solid ${EVENT_TYPE_COLORS[event.type]}40`,
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                        <span
                                            style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: '600',
                                                background: `${EVENT_TYPE_COLORS[event.type]}20`,
                                                color: EVENT_TYPE_COLORS[event.type],
                                            }}
                                        >
                                            {EVENT_TYPE_LABELS[event.type]}
                                        </span>
                                        {index > 0 && (
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                +{formatDuration(eventTime.getTime() - new Date(sortedEvents[index - 1].timestamp).getTime())}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: '500' }}>
                                        {formatDateTime(eventTime, userTimeZone, { format: 'datetime' })}
                                    </span>
                                </div>
                                <h4 style={{ 
                                    fontSize: 'var(--font-size-base)', 
                                    fontWeight: '600', 
                                    marginBottom: 'var(--spacing-1)',
                                    color: 'var(--text-primary)',
                                }}>
                                    {event.title}
                                </h4>
                                {event.description && (
                                    <p style={{ 
                                        fontSize: 'var(--font-size-sm)', 
                                        color: 'var(--text-secondary)',
                                        lineHeight: '1.6',
                                        marginBottom: 'var(--spacing-1)',
                                    }}>
                                        {event.description}
                                    </p>
                                )}
                                {event.actor && (
                                    <p style={{ 
                                        fontSize: 'var(--font-size-xs)', 
                                        color: 'var(--text-muted)',
                                        fontStyle: 'italic',
                                    }}>
                                        👤 {event.actor}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

