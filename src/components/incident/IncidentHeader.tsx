'use client';

import Link from 'next/link';
import StatusBadge from './StatusBadge';
import EscalationStatusBadge from './EscalationStatusBadge';
import PriorityBadge from './PriorityBadge';
import AssigneeSection from './AssigneeSection';
import { Incident, Service } from '@prisma/client';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

type IncidentHeaderProps = {
    incident: Incident & {
        service: Service & {
            policy?: { id: string; name: string } | null;
        };
        assignee: { id: string; name: string; email: string } | null;
        team?: { id: string; name: string } | null;
    };
    users: Array<{ id: string; name: string; email: string }>;
    teams: Array<{ id: string; name: string }>;
    canManage: boolean;
};

export default function IncidentHeader({ incident, users, teams, canManage }: IncidentHeaderProps) {
    const { userTimeZone } = useTimezone();

    return (
        <div style={{
            padding: '2rem',
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 60%, #f3f4f6 100%)',
            border: '1px solid #e6e8ef',
            borderRadius: '0px',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                    <Link
                        href="/incidents"
                        style={{
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            marginBottom: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 500
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>←</span> Back to Incidents
                    </Link>

                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <span style={{
                            fontSize: '1.7rem',
                            fontWeight: '800',
                            letterSpacing: '-0.02em',
                            color: 'var(--primary)'
                        }}>
                            #{incident.id.slice(-5).toUpperCase()}
                        </span>
                        <StatusBadge status={incident.status as any} size="lg" showDot />
                        {incident.escalationStatus && (
                            <EscalationStatusBadge
                                status={incident.escalationStatus}
                                currentStep={incident.currentEscalationStep}
                                nextEscalationAt={incident.nextEscalationAt}
                            />
                        )}
                        <PriorityBadge priority={incident.priority} size="lg" showLabel />
                    </div>

                    <h1 style={{
                        fontSize: '2.1rem',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        marginBottom: '0.35rem',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2
                    }}>
                        {incident.title}
                    </h1>

                    {incident.description && (
                        <p style={{
                            color: 'var(--text-secondary)',
                            maxWidth: '720px',
                            lineHeight: 1.6,
                            fontSize: '1rem'
                        }}>
                            {incident.description}
                        </p>
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '0.35rem',
                    background: 'rgba(15, 23, 42, 0.04)',
                    padding: '0.75rem 1rem',
                    borderRadius: '0px',
                    border: '1px solid rgba(15, 23, 42, 0.06)'
                }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        Created
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatDateTime(incident.createdAt, userTimeZone, { format: 'datetime' })}
                    </div>
                    {incident.acknowledgedAt && (
                        <>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.5rem' }}>
                                Acknowledged
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {formatDateTime(incident.acknowledgedAt, userTimeZone, { format: 'datetime' })}
                            </div>
                        </>
                    )}
                    {incident.resolvedAt && (
                        <>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.5rem' }}>
                                Resolved
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.9rem' }}>
                                {formatDateTime(incident.resolvedAt, userTimeZone, { format: 'datetime' })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: incident.status === 'RESOLVED' ? '#16a34a' : (incident.status === 'ACKNOWLEDGED' ? '#f59e0b' : '#ef4444'),
                    boxShadow: '0 0 0 6px rgba(239, 68, 68, 0.08)'
                }}></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
                    Incident Overview
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem' }}>
                <div style={{
                    background: 'linear-gradient(180deg, rgba(211,47,47,0.08) 0%, #ffffff 85%)',
                    border: '1px solid rgba(211,47,47,0.18)',
                    borderRadius: '0px',
                    padding: '0.85rem',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)'
                }}>
                    <div style={{ height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #d32f2f 0%, #ff5252 100%)', marginBottom: '0.6rem' }}></div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.35rem' }}>
                        Service
                    </div>
                    <Link
                        href={`/services/${incident.serviceId}`}
                        style={{
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></span>
                        {incident.service.name}
                    </Link>
                </div>

                <div style={{
                    background: 'linear-gradient(180deg, rgba(211,47,47,0.08) 0%, #ffffff 85%)',
                    border: '1px solid rgba(211,47,47,0.18)',
                    borderRadius: '0px',
                    padding: '0.85rem',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)'
                }}>
                    <div style={{ height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #d32f2f 0%, #ff5252 100%)', marginBottom: '0.6rem' }}></div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.35rem' }}>
                        Urgency
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: incident.urgency === 'HIGH' ? 'var(--danger)' : 'var(--warning)' }}>
                        {incident.urgency}
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(180deg, rgba(211,47,47,0.08) 0%, #ffffff 85%)',
                    border: '1px solid rgba(211,47,47,0.18)',
                    borderRadius: '0px',
                    padding: '0.85rem',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)'
                }}>
                    <div style={{ height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #d32f2f 0%, #ff5252 100%)', marginBottom: '0.6rem' }}></div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
                        Assignee
                    </div>
                    <AssigneeSection
                        assignee={incident.assignee}
                        team={incident.team || null}
                        assigneeId={incident.assigneeId}
                        teamId={incident.teamId}
                        users={users}
                        teams={teams}
                        incidentId={incident.id}
                        canManage={canManage}
                        variant="header"
                    />
                </div>

                {incident.service.policy && (
                    <div style={{
                        background: 'linear-gradient(180deg, rgba(211,47,47,0.08) 0%, #ffffff 85%)',
                        border: '1px solid rgba(211,47,47,0.18)',
                        borderRadius: '0px',
                        padding: '0.85rem',
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)'
                    }}>
                        <div style={{ height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #d32f2f 0%, #ff5252 100%)', marginBottom: '0.6rem' }}></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.35rem' }}>
                            Escalation Policy
                        </div>
                        <Link
                            href={`/policies/${incident.service.policy.id}`}
                            style={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></span>
                            {incident.service.policy.name}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
