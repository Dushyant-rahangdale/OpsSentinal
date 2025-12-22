'use client';

import { useState } from 'react';
import Link from 'next/link';

interface IncidentEvent {
    id: string;
    message: string;
    createdAt: Date;
}

interface Incident {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    createdAt: Date;
    resolvedAt?: Date | null;
    service: {
        id: string;
        name: string;
    };
    events: IncidentEvent[];
}

interface StatusPageIncidentsProps {
    incidents: Incident[];
}

export default function StatusPageIncidents({ incidents }: StatusPageIncidentsProps) {
    const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());

    const toggleIncident = (id: string) => {
        const newSet = new Set(expandedIncidents);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIncidents(newSet);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RESOLVED':
                return { bg: '#d1fae5', text: '#065f46', label: 'Resolved' };
            case 'ACKNOWLEDGED':
                return { bg: '#fef3c7', text: '#92400e', label: 'Acknowledged' };
            default:
                return { bg: '#fee2e2', text: '#991b1b', label: 'Investigating' };
        }
    };

    return (
        <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                marginBottom: '1.5rem',
                color: '#111827',
            }}>
                Recent Incidents
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {incidents.map((incident) => {
                    const statusColor = getStatusColor(incident.status);
                    const isExpanded = expandedIncidents.has(incident.id);
                    const timelineEvents = incident.events || [];

                    return (
                        <div
                            key={incident.id}
                            className="status-incident-card"
                            style={{
                                padding: '2rem',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '1rem',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ 
                                        fontSize: '1.25rem', 
                                        fontWeight: '700', 
                                        color: '#111827',
                                        marginBottom: '0.5rem',
                                        letterSpacing: '-0.01em',
                                    }}>
                                        {incident.title}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', flexWrap: 'wrap' }}>
                                        <span>{incident.service.name}</span>
                                        <span>•</span>
                                        <span>
                                            {new Date(incident.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        {incident.resolvedAt && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    Resolved {new Date(incident.resolvedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        background: statusColor.bg,
                                        color: statusColor.text,
                                    }}>
                                        {statusColor.label}
                                    </span>
                                    {timelineEvents.length > 0 && (
                                        <button
                                            onClick={() => toggleIncident(incident.id)}
                                            style={{
                                                padding: '0.25rem 0.5rem',
                                                background: 'transparent',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.75rem',
                                                color: '#6b7280',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#f3f4f6';
                                                e.currentTarget.style.borderColor = '#d1d5db';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                            }}
                                        >
                                            {isExpanded ? 'Hide' : 'Show'} Updates
                                        </button>
                                    )}
                                </div>
                            </div>

                            {incident.description && (
                                <p style={{ 
                                    color: '#374151', 
                                    lineHeight: '1.6',
                                    marginBottom: '1rem',
                                }}>
                                    {incident.description}
                                </p>
                            )}

                            {isExpanded && timelineEvents.length > 0 && (
                                <div style={{
                                    marginTop: '1rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid #e5e7eb',
                                }}>
                                    <h4 style={{ 
                                        fontSize: '0.875rem', 
                                        fontWeight: '600', 
                                        marginBottom: '0.75rem',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>
                                        Timeline
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {timelineEvents.map((event, index) => (
                                            <div
                                                key={event.id}
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.75rem',
                                                    paddingLeft: '1rem',
                                                    borderLeft: index === timelineEvents.length - 1 ? 'none' : '2px solid #e5e7eb',
                                                }}
                                            >
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: '#3b82f6',
                                                    marginTop: '0.375rem',
                                                    flexShrink: 0,
                                                }} />
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ 
                                                        color: '#374151', 
                                                        fontSize: '0.875rem',
                                                        marginBottom: '0.25rem',
                                                    }}>
                                                        {event.message}
                                                    </p>
                                                    <span style={{ 
                                                        fontSize: '0.75rem', 
                                                        color: '#9ca3af',
                                                    }}>
                                                        {new Date(event.createdAt).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

