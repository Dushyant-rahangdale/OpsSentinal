'use client';

import { memo } from 'react';
import Link from 'next/link';
import StatusBadge from '../incident/StatusBadge';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

// Simple date formatting helper - moved outside component to prevent recreation
function formatDistanceToNow(date: Date, timeZone: string): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateTime(date, timeZone, { format: 'date' });
}

type Incident = {
    id: string;
    title: string;
    status: string;
    urgency: string;
    priority: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
    assignee: { id: string; name: string; email: string } | null;
};

type IncidentListProps = {
    incidents: Incident[];
    serviceId: string;
};

function IncidentList({ incidents, serviceId }: IncidentListProps) {
    const { userTimeZone } = useTimezone();
    
    if (incidents.length === 0) {
        return (
            <div style={{ 
                padding: '3rem 2rem', 
                textAlign: 'center',
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: '0px'
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    No incidents recorded
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    This service has no recorded incidents.
                </p>
                <Link 
                    href={`/incidents/create?serviceId=${serviceId}`}
                    className="glass-button primary"
                    style={{ display: 'inline-block' }}
                >
                    Create First Incident
                </Link>
            </div>
        );
    }

    return (
        <div style={{ 
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            overflow: 'hidden'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                gap: '1rem',
                padding: '1rem 1.5rem',
                background: '#f8fafc',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)'
            }}>
                <div>Incident</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Assignee</div>
                <div>Created</div>
            </div>
            <div>
                {incidents.map((incident) => (
                    <Link
                        key={incident.id}
                        href={`/incidents/${incident.id}`}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                            gap: '1rem',
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border)',
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <div>
                            <div style={{ 
                                fontWeight: '600', 
                                color: 'var(--text-primary)',
                                marginBottom: '0.25rem',
                                fontSize: '0.95rem'
                            }}>
                                {incident.title}
                            </div>
                            {incident.urgency === 'HIGH' && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: 'var(--danger)',
                                    borderRadius: '4px',
                                    fontWeight: '600'
                                }}>
                                    High Urgency
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <StatusBadge status={incident.status as any} size="sm" showDot />
                        </div>
                        <div>
                            {incident.priority ? (
                                <span style={{
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: incident.priority === 'P1' ? 'var(--danger)' : 
                                           incident.priority === 'P2' ? '#f97316' : 
                                           incident.priority === 'P3' ? 'var(--warning)' : 'var(--text-muted)'
                                }}>
                                    {incident.priority}
                                </span>
                            ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                            )}
                        </div>
                        <div>
                            {incident.assignee ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    {incident.assignee.name}
                                </div>
                            ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unassigned</span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(new Date(incident.createdAt), userTimeZone)}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

// Memoize IncidentList to prevent unnecessary re-renders when parent updates
export default memo(IncidentList, (prevProps, nextProps) => {
    // Custom comparison: only re-render if incidents or serviceId changed
    return (
        prevProps.serviceId === nextProps.serviceId &&
        prevProps.incidents.length === nextProps.incidents.length &&
        prevProps.incidents.every((inc, i) => 
            inc.id === nextProps.incidents[i]?.id &&
            inc.status === nextProps.incidents[i]?.status &&
            inc.urgency === nextProps.incidents[i]?.urgency &&
            inc.priority === nextProps.incidents[i]?.priority &&
            inc.createdAt.getTime() === nextProps.incidents[i]?.createdAt.getTime() &&
            inc.resolvedAt?.getTime() === nextProps.incidents[i]?.resolvedAt?.getTime() &&
            inc.assignee?.id === nextProps.incidents[i]?.assignee?.id
        )
    );
});
