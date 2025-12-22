'use client';

import { useState } from 'react';
import { Button, FormField } from '@/components/ui';

export type TimelineEvent = {
    id: string;
    timestamp: string; // ISO string
    type: 'DETECTION' | 'ESCALATION' | 'MITIGATION' | 'RESOLUTION';
    title: string;
    description: string;
    actor?: string;
};

interface PostmortemTimelineBuilderProps {
    events: TimelineEvent[];
    onChange: (events: TimelineEvent[]) => void;
}

const EVENT_TYPE_COLORS = {
    DETECTION: '#3b82f6', // Blue
    ESCALATION: '#f59e0b', // Orange
    MITIGATION: '#8b5cf6', // Purple
    RESOLUTION: '#22c55e', // Green
};

const EVENT_TYPE_LABELS = {
    DETECTION: 'Detection',
    ESCALATION: 'Escalation',
    MITIGATION: 'Mitigation',
    RESOLUTION: 'Resolution',
};

export default function PostmortemTimelineBuilder({ events, onChange }: PostmortemTimelineBuilderProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({
        type: 'DETECTION',
        timestamp: new Date().toISOString().slice(0, 16),
    });

    const addEvent = () => {
        if (!newEvent.title || !newEvent.timestamp) return;

        const event: TimelineEvent = {
            id: `event-${Date.now()}`,
            timestamp: newEvent.timestamp,
            type: newEvent.type || 'DETECTION',
            title: newEvent.title,
            description: newEvent.description || '',
            actor: newEvent.actor,
        };

        const updated = [...events, event].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        onChange(updated);
        setNewEvent({
            type: 'DETECTION',
            timestamp: new Date().toISOString().slice(0, 16),
        });
    };

    const updateEvent = (id: string, updates: Partial<TimelineEvent>) => {
        const updated = events.map(e => e.id === id ? { ...e, ...updates } : e);
        onChange(updated);
    };

    const deleteEvent = (id: string) => {
        onChange(events.filter(e => e.id !== id));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ 
                padding: 'var(--spacing-4)', 
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
            }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--spacing-3)' }}>
                    Add Timeline Event
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                        <FormField
                            label="Event Type"
                            type="select"
                            value={newEvent.type || 'DETECTION'}
                            onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                            options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                        />
                        <FormField
                            label="Timestamp"
                            type="datetime-local"
                            value={newEvent.timestamp || ''}
                            onChange={(e) => setNewEvent({ ...newEvent, timestamp: e.target.value })}
                        />
                    </div>
                    <FormField
                        label="Title"
                        value={newEvent.title || ''}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        placeholder="e.g., Incident detected by monitoring system"
                    />
                    <FormField
                        label="Description"
                        type="textarea"
                        rows={3}
                        value={newEvent.description || ''}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Detailed description of what happened..."
                    />
                    <FormField
                        label="Actor (Optional)"
                        value={newEvent.actor || ''}
                        onChange={(e) => setNewEvent({ ...newEvent, actor: e.target.value })}
                        placeholder="Who or what triggered this event?"
                    />
                    <Button
                        type="button"
                        variant="primary"
                        onClick={addEvent}
                        disabled={!newEvent.title || !newEvent.timestamp}
                    >
                        Add Event
                    </Button>
                </div>
            </div>

            {events.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--spacing-2)' }}>
                        Timeline Events ({events.length})
                    </h3>
                    {events.map((event, index) => (
                        <div
                            key={event.id}
                            style={{
                                padding: 'var(--spacing-4)',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: 'var(--radius-md)',
                                borderLeft: `4px solid ${EVENT_TYPE_COLORS[event.type]}`,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-2)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-1)' }}>
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
                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                            {new Date(event.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', marginBottom: 'var(--spacing-1)' }}>
                                        {event.title}
                                    </h4>
                                    {event.description && (
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-1)' }}>
                                            {event.description}
                                        </p>
                                    )}
                                    {event.actor && (
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                            Actor: {event.actor}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setEditingId(editingId === event.id ? null : event.id)}
                                    >
                                        {editingId === event.id ? 'Cancel' : 'Edit'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => deleteEvent(event.id)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                            {editingId === event.id && (
                                <div style={{ 
                                    marginTop: 'var(--spacing-3)', 
                                    padding: 'var(--spacing-3)', 
                                    background: 'var(--color-neutral-50)',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--spacing-2)',
                                }}>
                                    <FormField
                                        label="Type"
                                        type="select"
                                        value={event.type}
                                        onChange={(e) => updateEvent(event.id, { type: e.target.value as any })}
                                        options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                                    />
                                    <FormField
                                        label="Timestamp"
                                        type="datetime-local"
                                        value={new Date(event.timestamp).toISOString().slice(0, 16)}
                                        onChange={(e) => updateEvent(event.id, { timestamp: e.target.value })}
                                    />
                                    <FormField
                                        label="Title"
                                        value={event.title}
                                        onChange={(e) => updateEvent(event.id, { title: e.target.value })}
                                    />
                                    <FormField
                                        label="Description"
                                        type="textarea"
                                        rows={2}
                                        value={event.description}
                                        onChange={(e) => updateEvent(event.id, { description: e.target.value })}
                                    />
                                    <FormField
                                        label="Actor"
                                        value={event.actor || ''}
                                        onChange={(e) => updateEvent(event.id, { actor: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

