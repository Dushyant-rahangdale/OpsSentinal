'use client';

import { useState } from 'react';
import { useBrowserTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

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

const INCIDENTS_PER_PAGE = 10;

export default function StatusPageIncidents({ incidents }: StatusPageIncidentsProps) {
    const browserTimeZone = useBrowserTimezone();
    const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(incidents.length / INCIDENTS_PER_PAGE);
    const startIndex = (currentPage - 1) * INCIDENTS_PER_PAGE;
    const endIndex = startIndex + INCIDENTS_PER_PAGE;
    const paginatedIncidents = incidents.slice(startIndex, endIndex);

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
                return { bg: '#d1fae5', text: '#065f46', label: 'Resolved', border: '#10b981' };
            case 'ACKNOWLEDGED':
                return { bg: '#fef3c7', text: '#92400e', label: 'Acknowledged', border: '#f59e0b' };
            default:
                return { bg: '#fee2e2', text: '#991b1b', label: 'Investigating', border: '#ef4444' };
        }
    };

    return (
        <section style={{ marginBottom: '4rem' }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem',
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
                        Recent Incidents
                    </h2>
                    {incidents.length > 0 && (
                        <p style={{ 
                            fontSize: '0.875rem', 
                            color: '#64748b',
                            margin: 0,
                        }}>
                            Showing {startIndex + 1}-{Math.min(endIndex, incidents.length)} of {incidents.length} incidents
                        </p>
                    )}
                </div>
            </div>
            
            {paginatedIncidents.length === 0 ? (
                <div style={{
                    padding: '5rem 2rem',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '2px solid #e5e7eb',
                    borderRadius: '1rem',
                    textAlign: 'center',
                    color: '#6b7280',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                }}>
                    <div style={{ 
                        fontSize: '4rem', 
                        marginBottom: '1.5rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontWeight: '800',
                    }}>
                        ✓
                    </div>
                    <p style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: '700', 
                        marginBottom: '0.5rem', 
                        color: '#10b981',
                        letterSpacing: '-0.01em',
                    }}>
                        No incidents in the last 90 days
                    </p>
                    <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
                        All systems operational
                    </p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {paginatedIncidents.map((incident) => {
                            const statusColor = getStatusColor(incident.status);
                            const isExpanded = expandedIncidents.has(incident.id);
                            const timelineEvents = incident.events || [];

                            return (
                                <div
                                    key={incident.id}
                                    className="status-incident-card"
                                    style={{
                                        padding: '2rem',
                                        background: '#ffffff',
                                        border: `2px solid ${statusColor.border}30`,
                                        borderRadius: '1rem',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = `0 12px 24px ${statusColor.border}25, 0 0 0 1px ${statusColor.border}50`;
                                        e.currentTarget.style.borderColor = `${statusColor.border}`;
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                        e.currentTarget.style.borderColor = `${statusColor.border}30`;
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {/* Status indicator bar */}
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '5px',
                                        background: `linear-gradient(180deg, ${statusColor.border} 0%, ${statusColor.border}cc 100%)`,
                                        boxShadow: `0 0 8px ${statusColor.border}40`,
                                    }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: 0, paddingLeft: '1rem' }}>
                                            <h3 style={{ 
                                                fontSize: '1.375rem', 
                                                fontWeight: '800', 
                                                color: '#111827',
                                                marginBottom: '0.75rem',
                                                letterSpacing: '-0.02em',
                                                lineHeight: '1.3',
                                            }}>
                                                {incident.title}
                                            </h3>
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: '1rem', 
                                                fontSize: '0.875rem', 
                                                color: '#6b7280', 
                                                flexWrap: 'wrap',
                                                alignItems: 'center',
                                            }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem',
                                                }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.625rem',
                                                        borderRadius: '0.375rem',
                                                        background: '#f3f4f6',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                    }}>
                                                        {incident.service.name}
                                                    </span>
                                                </div>
                                                <span>|</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polyline points="12 6 12 12 16 14"></polyline>
                                                    </svg>
                                                    {formatDateTime(incident.createdAt, browserTimeZone, { format: 'datetime' })}
                                                </span>
                                                {incident.resolvedAt && (
                                                    <>
                                                        <span>|</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#10b981' }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                            Resolved {formatDateTime(incident.resolvedAt, browserTimeZone, { format: 'short' })}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                            <span style={{
                                                padding: '0.5rem 1.125rem',
                                                borderRadius: '0.625rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: '700',
                                                background: `linear-gradient(135deg, ${statusColor.bg} 0%, ${statusColor.bg}dd 100%)`,
                                                color: statusColor.text,
                                                border: `2px solid ${statusColor.border}60`,
                                                boxShadow: `0 2px 8px ${statusColor.border}30`,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                e.currentTarget.style.boxShadow = `0 4px 12px ${statusColor.border}50`;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.boxShadow = `0 2px 8px ${statusColor.border}30`;
                                            }}
                                            >
                                                {statusColor.label}
                                            </span>
                                            {timelineEvents.length > 0 && (
                                                <button
                                                    onClick={() => toggleIncident(incident.id)}
                                                    style={{
                                                        padding: '0.625rem 1.25rem',
                                                        background: 'white',
                                                        border: '2px solid #e5e7eb',
                                                        borderRadius: '0.625rem',
                                                        fontSize: '0.8125rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#f9fafb';
                                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.borderColor = '#e5e7eb';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                                    }}
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="18 15 12 9 6 15"></polyline>
                                                            </svg>
                                                            Hide
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="6 9 12 15 18 9"></polyline>
                                                            </svg>
                                                            Show Updates
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {incident.description && (
                                        <p style={{ 
                                            color: '#374151', 
                                            lineHeight: '1.7',
                                            marginBottom: '1rem',
                                            paddingLeft: '1rem',
                                            fontSize: '0.9375rem',
                                        }}>
                                            {incident.description}
                                        </p>
                                    )}

                                    {isExpanded && timelineEvents.length > 0 && (
                                            <div style={{
                                                marginTop: '1.5rem',
                                                paddingTop: '1.5rem',
                                                borderTop: '2px solid #e5e7eb',
                                                paddingLeft: '1rem',
                                                background: 'linear-gradient(90deg, #f8fafc 0%, transparent 100%)',
                                                borderRadius: '0.5rem',
                                                padding: '1.5rem 1rem',
                                            }}>
                                                <h4 style={{ 
                                                    fontSize: '0.875rem', 
                                                    fontWeight: '700', 
                                                    marginBottom: '1.25rem',
                                                    color: '#374151',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                }}>
                                                    <div style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: '#3b82f6',
                                                        boxShadow: '0 0 0 3px #3b82f620',
                                                    }}></div>
                                                    Timeline Updates
                                                </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {timelineEvents.map((event, index) => (
                                                    <div
                                                        key={event.id}
                                                        style={{
                                                            display: 'flex',
                                                            gap: '1rem',
                                                            paddingLeft: '1.5rem',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {/* Timeline line */}
                                                        {index < timelineEvents.length - 1 && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                left: '0.5rem',
                                                                top: '1.5rem',
                                                                bottom: '-1rem',
                                                                width: '2px',
                                                                background: 'linear-gradient(180deg, #3b82f6 0%, #e5e7eb 100%)',
                                                            }} />
                                                        )}
                                                        {/* Timeline dot */}
                                                        <div style={{
                                                            width: '14px',
                                                            height: '14px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                            border: '3px solid white',
                                                            boxShadow: '0 0 0 2px #3b82f6, 0 2px 12px rgba(59, 130, 246, 0.4)',
                                                            marginTop: '0.25rem',
                                                            flexShrink: 0,
                                                            zIndex: 1,
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1.2)';
                                                            e.currentTarget.style.boxShadow = '0 0 0 3px #3b82f6, 0 4px 16px rgba(59, 130, 246, 0.5)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                            e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6, 0 2px 12px rgba(59, 130, 246, 0.4)';
                                                        }}
                                                        />
                                                        <div style={{ flex: 1, paddingBottom: index < timelineEvents.length - 1 ? '1rem' : '0' }}>
                                                            <p style={{ 
                                                                color: '#111827', 
                                                                fontSize: '0.9375rem',
                                                                marginBottom: '0.5rem',
                                                                fontWeight: '500',
                                                                lineHeight: '1.6',
                                                            }}>
                                                                {event.message}
                                                            </p>
                                                            <span style={{ 
                                                                fontSize: '0.8125rem', 
                                                                color: '#9ca3af',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.375rem',
                                                            }}>
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <circle cx="12" cy="12" r="10"></circle>
                                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                                </svg>
                                                                {formatDateTime(event.createdAt, browserTimeZone, { format: 'short' })}
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '2rem',
                            flexWrap: 'wrap',
                        }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    background: currentPage === 1 ? '#f3f4f6' : 'white',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                                onMouseEnter={(e) => {
                                    if (currentPage !== 1) {
                                        e.currentTarget.style.background = '#f9fafb';
                                        e.currentTarget.style.borderColor = '#d1d5db';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (currentPage !== 1) {
                                        e.currentTarget.style.background = 'white';
                                        e.currentTarget.style.borderColor = '#e5e7eb';
                                    }
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                Previous
                            </button>

                            <div style={{
                                display: 'flex',
                                gap: '0.375rem',
                                alignItems: 'center',
                            }}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                style={{
                                                    padding: '0.625rem 1rem',
                                                    background: currentPage === page ? '#667eea' : 'white',
                                                    border: `2px solid ${currentPage === page ? '#667eea' : '#e5e7eb'}`,
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '700',
                                                    color: currentPage === page ? 'white' : '#374151',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    minWidth: '2.5rem',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (currentPage !== page) {
                                                        e.currentTarget.style.background = '#f9fafb';
                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (currentPage !== page) {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.borderColor = '#e5e7eb';
                                                    }
                                                }}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (
                                        page === currentPage - 2 ||
                                        page === currentPage + 2
                                    ) {
                                        return (
                                            <span key={page} style={{ color: '#9ca3af', padding: '0 0.25rem' }}>
                                                ...
                                            </span>
                                        );
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    background: currentPage === totalPages ? '#f3f4f6' : 'white',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                                onMouseEnter={(e) => {
                                    if (currentPage !== totalPages) {
                                        e.currentTarget.style.background = '#f9fafb';
                                        e.currentTarget.style.borderColor = '#d1d5db';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (currentPage !== totalPages) {
                                        e.currentTarget.style.background = 'white';
                                        e.currentTarget.style.borderColor = '#e5e7eb';
                                    }
                                }}
                            >
                                Next
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
