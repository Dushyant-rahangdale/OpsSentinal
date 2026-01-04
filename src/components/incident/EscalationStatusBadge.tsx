'use client';

import { memo } from 'react';

type EscalationStatusBadgeProps = {
  status: string | null | undefined;
  currentStep: number | null | undefined;
  nextEscalationAt: Date | null | undefined;
  size?: 'sm' | 'md';
};

function EscalationStatusBadge({
  status,
  currentStep,
  nextEscalationAt,
  size = 'md',
}: EscalationStatusBadgeProps) {
  if (!status || status === 'COMPLETED') {
    return null;
  }

  const sizeStyles = {
    sm: { padding: '0.2rem 0.5rem', fontSize: '0.7rem' },
    md: { padding: '0.25rem 0.6rem', fontSize: '0.75rem' },
  };

  const style = sizeStyles[size];

  const getTimeUntilNext = () => {
    if (!nextEscalationAt) return null;
    const now = new Date();
    const nextDate =
      nextEscalationAt instanceof Date ? nextEscalationAt : new Date(nextEscalationAt);
    const diff = nextDate.getTime() - now.getTime();
    if (diff < 0) return 'Due now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  };

  const timeText = getTimeUntilNext();
  const compact = size === 'sm';
  const stepText =
    currentStep !== null && currentStep !== undefined ? `Step ${currentStep + 1}` : null;
  const titleParts = [
    status === 'ESCALATING' ? 'Escalating' : 'Escalation',
    stepText,
    timeText ? `Next: ${timeText}` : null,
  ].filter(Boolean);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        ...style,
        background:
          status === 'ESCALATING'
            ? 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)'
            : 'linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%)',
        color: status === 'ESCALATING' ? '#b45309' : '#6b7280',
        border:
          status === 'ESCALATING'
            ? '1px solid rgba(180, 83, 9, 0.2)'
            : '1px solid rgba(107, 114, 128, 0.2)',
        borderRadius: '9999px',
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: status === 'ESCALATING' ? '#f59e0b' : '#9ca3af',
          boxShadow: status === 'ESCALATING' ? '0 0 0 2px #f59e0b33' : '0 0 0 2px #9ca3af33',
        }}
      />
      <span title={titleParts.join(' • ')}>
        Escalating
        {!compact && stepText && <span style={{ opacity: 0.8 }}>• {stepText}</span>}
        {timeText && <span style={{ fontSize: '0.7em', opacity: 0.8 }}>• {timeText}</span>}
      </span>
    </div>
  );
}

// Memoize EscalationStatusBadge to prevent unnecessary re-renders
export default memo(EscalationStatusBadge);
