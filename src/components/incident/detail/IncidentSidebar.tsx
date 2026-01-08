'use client';

import type { IncidentStatus, Service } from '@prisma/client';
import Link from 'next/link';
import StatusBadge from '../StatusBadge';
import SLAIndicator from '../SLAIndicator';
import IncidentQuickActions from '../IncidentQuickActions';
import IncidentStatusActions from './IncidentStatusActions';
import IncidentWatchers from './IncidentWatchers';
import IncidentTags from './IncidentTags';

type IncidentSidebarProps = {
  incident: {
    id: string;
    status: IncidentStatus;
    assigneeId: string | null;
    assignee: { id: string; name: string; email: string } | null;
    service: {
      id: string;
      name: string;
      targetAckMinutes?: number | null;
      targetResolveMinutes?: number | null;
    };
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
    createdAt: Date;
    escalationStatus?: string | null;
    currentEscalationStep?: number | null;
    nextEscalationAt?: Date | null;
  };
  users: Array<{ id: string; name: string; email: string }>;
  watchers: Array<{
    id: string;
    user: { id: string; name: string; email: string };
    role: string;
  }>;
  tags: Array<{ id: string; name: string; color?: string | null }>;
  canManage: boolean;
  onAcknowledge: () => void;
  onUnacknowledge: () => void;
  onSnooze: () => void;
  onUnsnooze: () => void;
  onSuppress: () => void;
  onUnsuppress: () => void;
  onAddWatcher: (formData: FormData) => void;
  onRemoveWatcher: (formData: FormData) => void;
};

export default function IncidentSidebar({
  incident,
  users,
  watchers,
  tags,
  canManage,
  onAcknowledge,
  onUnacknowledge,
  onSnooze,
  onUnsnooze,
  onSuppress,
  onUnsuppress,
  onAddWatcher,
  onRemoveWatcher,
}: IncidentSidebarProps) {
  const incidentStatus = incident.status as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const incidentForSLA = incident as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const serviceForSLA = incident.service as Service;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Status & Actions Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e6e8ef',
          borderRadius: '0px',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h4 style={{ fontWeight: '700', fontSize: '1.1rem' }}>Actions</h4>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            Controls
          </span>
        </div>

        {/* Status Display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: '0px',
            background: '#fff',
            border: '1px solid #e6e8ef',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '0.25rem',
              }}
            >
              Status
            </div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              {incident.status}
            </div>
          </div>
          <StatusBadge status={incidentStatus} size="md" showDot />
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '1rem' }}>
          <IncidentQuickActions incidentId={incident.id} serviceId={incident.service.id} />
        </div>

        {/* Status Actions */}
        <IncidentStatusActions
          incidentId={incident.id}
          currentStatus={incident.status}
          onAcknowledge={onAcknowledge}
          onUnacknowledge={onUnacknowledge}
          onSnooze={onSnooze}
          onUnsnooze={onUnsnooze}
          onSuppress={onSuppress}
          onUnsuppress={onUnsuppress}
          canManage={canManage}
        />
      </div>

      {/* SLA Indicator */}
      <div style={{ marginBottom: '0.5rem' }}>
        <SLAIndicator incident={incidentForSLA} service={serviceForSLA} showDetails={true} />
      </div>

      {/* Watchers */}
      <IncidentWatchers
        watchers={watchers}
        users={users}
        canManage={canManage}
        onAddWatcher={onAddWatcher}
        onRemoveWatcher={onRemoveWatcher}
      />

      {/* Tags */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e6e8ef',
          borderRadius: '0px',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
        }}
      >
        <IncidentTags incidentId={incident.id} tags={tags} canManage={canManage} />
      </div>

      {/* Postmortem Section - Only show for resolved incidents */}
      {incident.status === 'RESOLVED' && (
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e6e8ef',
            borderRadius: '0px',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h4 style={{ fontWeight: '700', fontSize: '1.1rem' }}>Postmortem</h4>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              Learning
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Document what happened, why it happened, and how to prevent it in the future.
          </p>
          <Link
            href={`/postmortems/${incident.id}`}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--primary-color)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0px',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--primary-dark)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--primary-color)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {canManage ? 'Create Postmortem' : 'View Postmortem'}
          </Link>
        </div>
      )}
    </div>
  );
}
