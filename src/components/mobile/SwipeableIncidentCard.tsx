'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SwipeableIncidentCardProps {
  incident: {
    id: string;
    title: string;
    status: string;
    urgency?: string | null;
    createdAt: string | Date;
    service?: { name: string } | null;
  };
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  isUpdating?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  acknowledged: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  snoozed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  suppressed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const URGENCY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};

export default function SwipeableIncidentCard({
  incident,
  onAcknowledge,
  onResolve,
  isUpdating = false,
}: SwipeableIncidentCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const translateXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startX = useRef(0);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.touches[0].clientX - startX.current;
    const maxSwipe = 120;
    const newTranslateX = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
    translateXRef.current = newTranslateX;
    setTranslateX(newTranslateX);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);

    if (isUpdating) {
      translateXRef.current = 0;
      setTranslateX(0);
      return;
    }

    const finalTranslateX = translateXRef.current;
    if (finalTranslateX < -threshold && onAcknowledge) {
      onAcknowledge(incident.id);
    } else if (finalTranslateX > threshold && onResolve) {
      onResolve(incident.id);
    }

    translateXRef.current = 0;
    setTranslateX(0);
  };

  const handleClick = () => {
    if (isUpdating) return;
    if (Math.abs(translateX) < 10) {
      router.push(`/m/incidents/${incident.id}`);
    }
  };

  const statusKey = incident.status.toLowerCase();
  const urgencyKey = (incident.urgency || 'low').toLowerCase();
  const createdAt = new Date(incident.createdAt);
  const timeAgo = getTimeAgo(createdAt);

  return (
    <div
      data-swipe-ignore="true"
      className={cn(
        'relative rounded-xl overflow-hidden',
        translateX < 0 && 'bg-gradient-to-r from-transparent via-transparent to-amber-500/20',
        translateX > 0 && 'bg-gradient-to-l from-transparent via-transparent to-emerald-500/20'
      )}
    >
      {/* Swipe action hints */}
      {translateX !== 0 && (
        <>
          {translateX < -20 && (
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-amber-500 dark:text-amber-400 text-xs font-bold"
              style={{ opacity: Math.min(1, Math.abs(translateX) / threshold) }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ACK
            </div>
          )}
          {translateX > 20 && (
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-emerald-500 dark:text-emerald-400 text-xs font-bold"
              style={{ opacity: Math.min(1, Math.abs(translateX) / threshold) }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              RESOLVE
            </div>
          )}
        </>
      )}

      {/* Card */}
      <div
        ref={cardRef}
        data-testid={`incident-card-${incident.id}`}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'flex flex-col gap-2 p-4 rounded-xl border transition-colors touch-pan-y',
          'bg-[color:var(--bg-surface)]',
          'border-[color:var(--border)]',
          isUpdating
            ? 'cursor-progress opacity-60'
            : 'cursor-pointer active:scale-[0.99] transition-transform'
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Header with status and urgency */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
              STATUS_STYLES[statusKey] ||
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {incident.status}
          </span>
          {incident.urgency && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
                URGENCY_STYLES[urgencyKey] ||
                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {incident.urgency}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-[color:var(--text-primary)] leading-snug line-clamp-2">
          {incident.title}
        </h3>

        {/* Meta info */}
        <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
          {incident.service?.name && (
            <>
              <span className="truncate">{incident.service.name}</span>
              <span className="text-[color:var(--text-disabled)]">•</span>
            </>
          )}
          <span suppressHydrationWarning>{timeAgo}</span>
        </div>

        {/* Swipe hint for open incidents */}
        {statusKey === 'open' && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1 opacity-70">
            ← Acknowledge • Resolve →
          </div>
        )}
      </div>

      {/* Updating overlay */}
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--bg-surface)] bg-opacity-80 rounded-xl backdrop-blur-sm">
          <span className="text-sm font-medium text-[color:var(--text-muted)]">Updating...</span>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
