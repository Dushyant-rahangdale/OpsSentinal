'use client';

import { memo, useMemo } from 'react';
import { calculateMTTA, calculateMTTR, checkAckSLA, checkResolveSLA } from '@/lib/sla';
import { formatTimeMinutesMs } from '@/lib/time-format';
import { getPrioritySLATarget, checkPriorityAckSLA, checkPriorityResolveSLA } from '@/lib/sla-priority';
import { Incident, Service } from '@prisma/client';

type SLAIndicatorProps = {
    incident: Incident;
    service: Service;
    showDetails?: boolean;
};

function SLAIndicator({ incident, service, showDetails = false }: SLAIndicatorProps) {
    // Memoize expensive SLA calculations
    const { mtta, mttr, ackSlaMet, resolveSlaMet, ackTimeRemaining, resolveTimeRemaining, targetAckMinutes, targetResolveMinutes } = useMemo(() => {
        const mtta = calculateMTTA(incident);
        const mttr = calculateMTTR(incident);
        
        // Use priority-based SLA if priority exists, otherwise use service defaults
        const priorityTarget = getPrioritySLATarget(incident.priority, service);
        const ackSlaMet = incident.acknowledgedAt 
            ? (incident.priority ? checkPriorityAckSLA(incident, service) : checkAckSLA(incident, service))
            : null;
        const resolveSlaMet = incident.resolvedAt 
            ? (incident.priority ? checkPriorityResolveSLA(incident, service) : checkResolveSLA(incident, service))
            : null;

        const targetAckMinutes = priorityTarget.ack;
        const targetResolveMinutes = priorityTarget.resolve;

        // Calculate time remaining for open incidents
        const now = new Date();
        const timeSinceCreation = (now.getTime() - incident.createdAt.getTime()) / (1000 * 60);
        const ackTimeRemaining = incident.status === 'OPEN' && !incident.acknowledgedAt
            ? targetAckMinutes - timeSinceCreation
            : null;
        const resolveTimeRemaining = incident.status !== 'RESOLVED' && !incident.resolvedAt
            ? targetResolveMinutes - timeSinceCreation
            : null;

        return {
            mtta,
            mttr,
            ackSlaMet,
            resolveSlaMet,
            ackTimeRemaining,
            resolveTimeRemaining,
            targetAckMinutes,
            targetResolveMinutes
        };
    }, [incident, service]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '0.875rem',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid var(--border)',
            borderRadius: '0px'
        }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                SLA Tracking
            </div>

            {showDetails && (
                <>
                    {/* Acknowledgement SLA */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acknowledgement</span>
                            {incident.acknowledgedAt ? (
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: ackSlaMet ? '#16a34a' : '#dc2626',
                                    background: ackSlaMet ? '#eaf7ef' : '#feecec',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '0px'
                                }}>
                                    {ackSlaMet ? '✓ Met' : '✗ Breached'}
                                </span>
                            ) : (
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: ackTimeRemaining && ackTimeRemaining > 0 ? '#6b7280' : '#dc2626',
                                    background: ackTimeRemaining && ackTimeRemaining > 0 ? '#f3f4f6' : '#feecec',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '0px'
                                }}>
                                    {ackTimeRemaining && ackTimeRemaining > 0 ? `⏱ ${Math.round(ackTimeRemaining)}m left` : '✗ Breached'}
                                </span>
                            )}
                        </div>
                        {mtta !== null && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Time: {formatTimeMinutesMs(mtta)} / Target: {targetAckMinutes}m
                            </div>
                        )}
                    </div>

                    {/* Resolution SLA */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Resolution</span>
                            {incident.resolvedAt ? (
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: resolveSlaMet ? '#16a34a' : '#dc2626',
                                    background: resolveSlaMet ? '#eaf7ef' : '#feecec',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '0px'
                                }}>
                                    {resolveSlaMet ? '✓ Met' : '✗ Breached'}
                                </span>
                            ) : (
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: resolveTimeRemaining && resolveTimeRemaining > 0 ? '#6b7280' : '#dc2626',
                                    background: resolveTimeRemaining && resolveTimeRemaining > 0 ? '#f3f4f6' : '#feecec',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '0px'
                                }}>
                                    {resolveTimeRemaining && resolveTimeRemaining > 0 ? `⏱ ${Math.round(resolveTimeRemaining)}m left` : '✗ Breached'}
                                </span>
                            )}
                        </div>
                        {mttr !== null && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Time: {formatTimeMinutesMs(mttr)} / Target: {targetResolveMinutes}m
                            </div>
                        )}
                    </div>
                </>
            )}

            {!showDetails && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {incident.acknowledgedAt && (
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: ackSlaMet ? '#16a34a' : '#dc2626',
                            background: ackSlaMet ? '#eaf7ef' : '#feecec',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0px'
                        }}>
                            Ack: {ackSlaMet ? '✓' : '✗'}
                        </span>
                    )}
                    {incident.resolvedAt && (
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: resolveSlaMet ? '#16a34a' : '#dc2626',
                            background: resolveSlaMet ? '#eaf7ef' : '#feecec',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0px'
                        }}>
                            Resolve: {resolveSlaMet ? '✓' : '✗'}
                        </span>
                    )}
                    {!incident.acknowledgedAt && !incident.resolvedAt && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {ackTimeRemaining && ackTimeRemaining > 0 ? `${Math.round(ackTimeRemaining)}m to acknowledge` : 'SLA breached'}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// Memoize SLAIndicator to prevent unnecessary re-renders when parent updates
export default memo(SLAIndicator, (prevProps, nextProps) => {
    // Custom comparison: only re-render if incident or service data actually changed
    return (
        prevProps.incident.id === nextProps.incident.id &&
        prevProps.incident.status === nextProps.incident.status &&
        prevProps.incident.acknowledgedAt?.getTime() === nextProps.incident.acknowledgedAt?.getTime() &&
        prevProps.incident.resolvedAt?.getTime() === nextProps.incident.resolvedAt?.getTime() &&
        prevProps.incident.priority === nextProps.incident.priority &&
        prevProps.service.id === nextProps.service.id &&
        prevProps.showDetails === nextProps.showDetails
    );
});
