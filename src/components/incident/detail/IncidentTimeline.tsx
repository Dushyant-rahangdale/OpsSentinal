'use client';

import TimelineEvent from '../TimelineEvent';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

type Event = {
    id: string;
    message: string;
    createdAt: Date;
};

type IncidentTimelineProps = {
    events: Event[];
    incidentCreatedAt?: Date;
    incidentAcknowledgedAt?: Date | null;
    incidentResolvedAt?: Date | null;
};

export default function IncidentTimeline({ 
    events, 
    incidentCreatedAt,
    incidentAcknowledgedAt,
    incidentResolvedAt 
}: IncidentTimelineProps) {
    const { userTimeZone } = useTimezone();

    const formatEscalationMessage = (message: string) => {
        const match = message.match(/\[\[scheduledAt=([^\]]+)\]\]/);
        if (!match) {
            return message;
        }

        const scheduledAtRaw = match[1];
        const scheduledAt = new Date(scheduledAtRaw);
        if (Number.isNaN(scheduledAt.getTime())) {
            return message.replace(match[0], scheduledAtRaw);
        }

        const formatted = formatDateTime(scheduledAt, userTimeZone, { format: 'datetime' });
        return message.replace(match[0], formatted);
    };
    
    // Create a comprehensive timeline with incident lifecycle events
    const timelineEvents: Array<{
        id: string;
        message: string;
        createdAt: Date;
        type: 'CREATED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EVENT';
        icon?: string;
    }> = [];

    // Add incident creation
    if (incidentCreatedAt) {
        timelineEvents.push({
            id: 'incident-created',
            message: 'Incident created',
            createdAt: incidentCreatedAt,
            type: 'CREATED',
            icon: '🚨',
        });
    }

    // Add acknowledgment
    if (incidentAcknowledgedAt) {
        timelineEvents.push({
            id: 'incident-acknowledged',
            message: 'Incident acknowledged',
            createdAt: incidentAcknowledgedAt,
            type: 'ACKNOWLEDGED',
            icon: '✅',
        });
    }

    // Add resolution
    if (incidentResolvedAt) {
        timelineEvents.push({
            id: 'incident-resolved',
            message: 'Incident resolved',
            createdAt: incidentResolvedAt,
            type: 'RESOLVED',
            icon: '🎯',
        });
    }

    // Add regular events
    events.forEach(event => {
        timelineEvents.push({
            ...event,
            type: 'EVENT',
        });
    });

    // Sort by date (oldest first for timeline)
    timelineEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Group events by date (using user's timezone)
    const groupedEvents = timelineEvents.reduce((acc, event) => {
        const eventDate = new Date(event.createdAt);
        
        // Get current date in user's timezone
        const now = new Date();
        const todayStr = formatDateTime(now, userTimeZone, { format: 'date' });
        const eventDateStr = formatDateTime(eventDate, userTimeZone, { format: 'date' });
        
        let groupKey: string;
        if (eventDateStr === todayStr) {
            groupKey = 'Today';
        } else {
            // Get yesterday's date in user's timezone
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = formatDateTime(yesterday, userTimeZone, { format: 'date' });
            
            if (eventDateStr === yesterdayStr) {
                groupKey = 'Yesterday';
            } else {
                // Use formatDateTime for timezone-aware date grouping
                // formatDateTime returns format like "Jan 15, 2024", convert to full month name
                const monthMap: Record<string, string> = {
                    'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
                    'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
                    'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
                };
                // Split by comma to separate date and year
                const parts = eventDateStr.split(',');
                if (parts.length === 2) {
                    const monthDay = parts[0].trim(); // "Jan 15"
                    const year = parts[1].trim(); // "2024"
                    const [monthAbbr, day] = monthDay.split(' ');
                    const fullMonth = monthMap[monthAbbr] || monthAbbr;
                    groupKey = `${fullMonth} ${day}, ${year}`;
                } else {
                    // Fallback: use formatted string as-is
                    groupKey = eventDateStr;
                }
            }
        }

        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(event);
        return acc;
    }, {} as Record<string, typeof timelineEvents>);

    const getEventColor = (type: string) => {
        switch (type) {
            case 'CREATED':
                return '#ef4444'; // Red
            case 'ACKNOWLEDGED':
                return '#3b82f6'; // Blue
            case 'RESOLVED':
                return '#22c55e'; // Green
            default:
                return '#6b7280'; // Gray
        }
    };

    return (
        <div className="glass-panel" style={{ 
            padding: '1.5rem', 
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', 
            border: '1px solid #e6e8ef', 
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)' 
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Timeline</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Complete incident lifecycle and event history</div>
                </div>
                <div style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    padding: '0.35rem 0.75rem',
                    background: '#f9fafb',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    {timelineEvents.length} Events
                </div>
            </div>

            {timelineEvents.length === 0 ? (
                <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: 'var(--text-muted)', 
                    fontStyle: 'italic',
                    background: '#f9fafb',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    No timeline events yet. Events will appear here as the incident is updated.
                </div>
            ) : (
                <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                    {/* Timeline line */}
                    <div style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '0',
                        bottom: '0',
                        width: '3px',
                        background: 'linear-gradient(180deg, #ef4444 0%, #3b82f6 50%, #22c55e 100%)',
                        borderRadius: 'var(--radius-sm)',
                    }} />

                    {Object.entries(groupedEvents).map(([groupKey, groupEvents], groupIndex) => (
                        <div key={groupKey} style={{ marginBottom: groupIndex < Object.keys(groupedEvents).length - 1 ? '2rem' : '0' }}>
                            <div style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                color: 'var(--text-muted)', 
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                marginBottom: '1rem',
                                paddingBottom: '0.5rem',
                                borderBottom: '1px solid var(--border)',
                                paddingLeft: '1.5rem',
                            }}>
                                {groupKey}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {groupEvents.map((event, index) => {
                                    const isFirst = index === 0 && groupIndex === 0;
                                    const isLast = index === groupEvents.length - 1 && groupIndex === Object.keys(groupedEvents).length - 1;
                                    const eventColor = getEventColor(event.type);
                                    
                                    return (
                                        <div 
                                            key={event.id} 
                                            style={{ 
                                                position: 'relative', 
                                                paddingLeft: '1.5rem', 
                                                paddingBottom: isLast ? 0 : '1.5rem',
                                                marginLeft: '-1.5rem',
                                            }}
                                        >
                                            {/* Timeline line between events */}
                                            {!isLast && (
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '0.5rem',
                                                    top: '1.5rem',
                                                    bottom: '-1.5rem',
                                                    width: '2px',
                                                    background: '#e2e8f0'
                                                }} />
                                            )}
                                            
                                            {/* Timeline dot */}
                                            <div style={{
                                                position: 'absolute',
                                                left: '0.25rem',
                                                top: '0.5rem',
                                                width: '16px',
                                                height: '16px',
                                                borderRadius: '50%',
                                                background: eventColor,
                                                border: '3px solid white',
                                                boxShadow: `0 0 0 3px ${eventColor}40, 0 2px 8px rgba(0,0,0,0.1)`,
                                                zIndex: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.7rem',
                                            }}>
                                                {event.icon || '•'}
                                            </div>

                                            {/* Event content */}
                                            <div style={{ marginTop: '0' }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-muted)',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}>
                                                    <span style={{
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: `${eventColor}20`,
                                                        color: eventColor,
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                    }}>
                                                        {event.type === 'CREATED' ? 'Created' : event.type === 'ACKNOWLEDGED' ? 'Acknowledged' : event.type === 'RESOLVED' ? 'Resolved' : 'Event'}
                                                    </span>
                                                    <span>
                                                        {formatDateTime(event.createdAt, userTimeZone, { format: 'time' })}
                                                    </span>
                                                    <span style={{ opacity: 0.6 }}>
                                                        {formatDateTime(event.createdAt, userTimeZone, { format: 'short' })}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    background: event.type !== 'EVENT' ? `${eventColor}10` : '#fff',
                                                    border: `1px solid ${event.type !== 'EVENT' ? eventColor + '40' : 'var(--border)'}`,
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '0.875rem 1rem',
                                                    boxShadow: event.type !== 'EVENT' ? `0 2px 8px ${eventColor}20` : '0 2px 4px rgba(0,0,0,0.04)',
                                                    color: 'var(--text-primary)',
                                                    lineHeight: 1.6,
                                                    fontWeight: event.type !== 'EVENT' ? '600' : '400',
                                                }}>
                                                    {formatEscalationMessage(event.message)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
