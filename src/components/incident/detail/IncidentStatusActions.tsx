'use client';

import { useState } from 'react';
import { IncidentStatus } from '@prisma/client';
import SnoozeDurationDialog from './SnoozeDurationDialog';
import { snoozeIncidentWithDuration } from '@/app/(app)/incidents/snooze-actions';

type IncidentStatusActionsProps = {
  incidentId: string;
  currentStatus: IncidentStatus;
  onAcknowledge: () => void;
  onUnacknowledge: () => void;
  onSnooze: () => void;
  onUnsnooze: () => void;
  onSuppress: () => void;
  onUnsuppress: () => void;
  canManage: boolean;
};

export default function IncidentStatusActions({
  incidentId,
  currentStatus,
  onAcknowledge,
  onUnacknowledge,
  onSnooze: _onSnooze,
  onUnsnooze,
  onSuppress,
  onUnsuppress,
  canManage,
}: IncidentStatusActionsProps) {
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);

  if (!canManage) {
    return (
      <div
        style={{
          padding: '0.75rem',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '0px',
          opacity: 0.7,
        }}
      >
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          ⚠️ Responder role required to manage incidents
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {/* Primary Actions */}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {currentStatus === 'ACKNOWLEDGED' ? (
          <form action={onUnacknowledge}>
            <button
              type="submit"
              className="glass-button"
              style={{
                width: '100%',
                background: 'linear-gradient(180deg, #feecec 0%, #fbdcdc 100%)',
                color: 'var(--danger)',
                border: '1px solid rgba(211,47,47,0.3)',
                borderRadius: '0px',
                boxShadow: '0 4px 12px rgba(211, 47, 47, 0.15)',
                padding: '0.75rem 1rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3l18 18M9 9l6 6" />
              </svg>
              Unacknowledge Incident
            </button>
          </form>
        ) : (
          currentStatus !== 'SUPPRESSED' &&
          currentStatus !== 'RESOLVED' &&
          currentStatus !== 'SNOOZED' && (
            <form action={onAcknowledge}>
              <button
                type="submit"
                className="glass-button"
                style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, #fff4cc 0%, #ffe9a8 100%)',
                  color: '#b45309',
                  border: '1px solid #f6c453',
                  borderRadius: '0px',
                  boxShadow: '0 10px 20px rgba(245, 158, 11, 0.15)',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Acknowledge Incident
              </button>
            </form>
          )
        )}
        {currentStatus === 'SNOOZED' && (
          <form action={onAcknowledge}>
            <button
              type="submit"
              className="glass-button"
              style={{
                width: '100%',
                background: 'linear-gradient(180deg, #fff4cc 0%, #ffe9a8 100%)',
                color: '#b45309',
                border: '1px solid #f6c453',
                borderRadius: '0px',
                boxShadow: '0 10px 20px rgba(245, 158, 11, 0.15)',
                padding: '0.75rem 1rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Acknowledge Incident
            </button>
          </form>
        )}
      </div>

      {/* Secondary Actions */}
      <div
        style={{
          padding: '0.75rem',
          background: '#f9fafb',
          border: '1px solid var(--border)',
          borderRadius: '0px',
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
            marginBottom: '0.25rem',
          }}
        >
          Additional Actions
        </div>

        {currentStatus === 'SNOOZED' ? (
          <form action={onUnsnooze}>
            <button
              type="submit"
              className="glass-button"
              style={{
                width: '100%',
                background: '#feecec',
                color: 'var(--danger)',
                border: '1px solid rgba(211,47,47,0.25)',
                borderRadius: '0px',
                padding: '0.625rem 0.875rem',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              🔔 Unsnooze Incident
            </button>
          </form>
        ) : (
          currentStatus !== 'SUPPRESSED' &&
          currentStatus !== 'RESOLVED' && (
            <button
              type="button"
              onClick={() => setShowSnoozeDialog(true)}
              className="glass-button"
              style={{
                width: '100%',
                background: '#f3f4f6',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0px',
                padding: '0.625rem 0.875rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⏰ Snooze Incident
            </button>
          )
        )}

        {currentStatus === 'SUPPRESSED' ? (
          <form action={onUnsuppress}>
            <button
              type="submit"
              className="glass-button"
              style={{
                width: '100%',
                background: '#feecec',
                color: 'var(--danger)',
                border: '1px solid rgba(211,47,47,0.25)',
                borderRadius: '0px',
                padding: '0.625rem 0.875rem',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              🔊 Unsuppress Incident
            </button>
          </form>
        ) : (
          currentStatus !== 'SNOOZED' &&
          currentStatus !== 'RESOLVED' && (
            <form action={onSuppress}>
              <button
                type="submit"
                className="glass-button"
                style={{
                  width: '100%',
                  background: '#f3f4f6',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0px',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                🔕 Suppress Incident
              </button>
            </form>
          )
        )}
      </div>

      {showSnoozeDialog && (
        <SnoozeDurationDialog
          incidentId={incidentId}
          onClose={() => setShowSnoozeDialog(false)}
          onSnooze={snoozeIncidentWithDuration}
        />
      )}
    </div>
  );
}
