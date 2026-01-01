'use client';

import Link from 'next/link';
import StatusBadge from './StatusBadge';
import EscalationStatusBadge from './EscalationStatusBadge';
import PriorityBadge from './PriorityBadge';
import AssigneeSection from './AssigneeSection';
import { Incident, Service } from '@prisma/client';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import styles from './IncidentHeader.module.css';

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
    const incidentStatus = incident.status as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'RESOLVED': return styles.resolved;
            case 'ACKNOWLEDGED': return styles.acknowledged;
            default: return styles.open;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.topSection}>
                <div className={styles.mainInfo}>
                    <Link href="/incidents" className={styles.backLink}>
                        <span>←</span> Back to Incidents
                    </Link>

                    <div className={styles.tagsRow}>
                        <span className={styles.incidentId}>
                            #{incident.id.slice(-5).toUpperCase()}
                        </span>
                        <StatusBadge status={incidentStatus} size="lg" showDot />
                        {incident.escalationStatus && (
                            <EscalationStatusBadge
                                status={incident.escalationStatus}
                                currentStep={incident.currentEscalationStep}
                                nextEscalationAt={incident.nextEscalationAt}
                            />
                        )}
                        <PriorityBadge priority={incident.priority} size="lg" showLabel />
                    </div>

                    <h1 className={styles.title}>
                        {incident.title}
                    </h1>

                    {incident.description && (
                        <p className={styles.description}>
                            {incident.description}
                        </p>
                    )}
                </div>

                <div className={styles.metaPanel}>
                    <div className={styles.metaLabel}>Created</div>
                    <div className={styles.metaValue}>
                        {formatDateTime(incident.createdAt, userTimeZone, { format: 'datetime' })}
                    </div>

                    {incident.acknowledgedAt && (
                        <>
                            <div className={styles.metaLabel} style={{ marginTop: '0.5rem' }}>Acknowledged</div>
                            <div className={styles.metaValue} style={{ color: 'var(--text-secondary)' }}>
                                {formatDateTime(incident.acknowledgedAt, userTimeZone, { format: 'datetime' })}
                            </div>
                        </>
                    )}

                    {incident.resolvedAt && (
                        <>
                            <div className={styles.metaLabel} style={{ marginTop: '0.5rem' }}>Resolved</div>
                            <div className={styles.metaValue} style={{ color: 'var(--color-success)' }}>
                                {formatDateTime(incident.resolvedAt, userTimeZone, { format: 'datetime' })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.overviewHeader}>
                <div className={`${styles.statusDot} ${getStatusClass(incident.status)}`}></div>
                <div className={styles.sectionTitle}>Incident Overview</div>
            </div>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <div className={styles.cardLabel}>Service</div>
                    <Link href={`/services/${incident.serviceId}`} className={styles.link}>
                        <span className={styles.linkIcon}></span>
                        {incident.service.name}
                    </Link>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardLabel}>Urgency</div>
                    <div className={`${styles.cardValue} ${incident.urgency === 'HIGH' ? styles.highUrgency : styles.lowUrgency}`}>
                        {incident.urgency}
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardLabel}>Assignee</div>
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
                    <div className={styles.card}>
                        <div className={styles.cardLabel}>Escalation Policy</div>
                        <Link href={`/policies/${incident.service.policy.id}`} className={styles.link}>
                            <span className={styles.linkIcon}></span>
                            {incident.service.policy.name}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
