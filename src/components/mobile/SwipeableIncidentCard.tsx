'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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

/**
 * Swipeable incident card for mobile
 * Swipe left to acknowledge, swipe right to resolve
 */
export default function SwipeableIncidentCard({
    incident,
    onAcknowledge,
    onResolve,
    isUpdating = false
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
        // Limit swipe range
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
            // Swiped left - Acknowledge
            onAcknowledge(incident.id);
        } else if (finalTranslateX > threshold && onResolve) {
            // Swiped right - Resolve
            onResolve(incident.id);
        }

        // Reset position
        translateXRef.current = 0;
        setTranslateX(0);
    };

    const handleClick = () => {
        if (isUpdating) return;
        if (Math.abs(translateX) < 10) {
            router.push(`/m/incidents/${incident.id}`);
        }
    };

    const getStatusColor = () => {
        switch (incident.status.toLowerCase()) {
            case 'open': return { bg: 'var(--badge-error-bg)', text: 'var(--badge-error-text)' };
            case 'acknowledged': return { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)' };
            case 'resolved': return { bg: 'var(--badge-success-bg)', text: 'var(--badge-success-text)' };
            case 'snoozed': return { bg: 'var(--badge-snoozed-bg)', text: 'var(--badge-snoozed-text)' };
            default: return { bg: 'var(--badge-neutral-bg)', text: 'var(--badge-neutral-text)' };
        }
    };

    const getUrgencyColor = () => {
        const urgencyValue = incident.urgency?.toLowerCase() || 'low';
        switch (urgencyValue) {
            case 'high': return { bg: 'var(--badge-error-bg)', text: 'var(--badge-error-text)' };
            case 'medium': return { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)' };
            case 'low': return { bg: 'var(--badge-success-bg)', text: 'var(--badge-success-text)' };
            default: return { bg: 'var(--badge-neutral-bg)', text: 'var(--badge-neutral-text)' };
        }
    };

    const statusColors = getStatusColor();
    const urgencyColors = getUrgencyColor();
    const createdAt = new Date(incident.createdAt);
    const timeAgo = getTimeAgo(createdAt);

    // Calculate background reveal colors based on swipe direction
    const revealBg = translateX < 0
        ? 'linear-gradient(90deg, transparent 60%, rgba(251, 191, 36, 0.3) 100%)' // Acknowledge - yellow
        : translateX > 0
            ? 'linear-gradient(270deg, transparent 60%, rgba(34, 197, 94, 0.3) 100%)' // Resolve - green
            : 'transparent';

    return (
        <div style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            background: revealBg
        }}>
            {/* Action hints */}
            {translateX !== 0 && (
                <>
                    {translateX < -20 && (
                        <div style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#fbbf24',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            opacity: Math.min(1, Math.abs(translateX) / threshold)
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            ACK
                        </div>
                    )}
                    {translateX > 20 && (
                        <div style={{
                            position: 'absolute',
                            left: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#22c55e',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            opacity: Math.min(1, Math.abs(translateX) / threshold)
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transform: `translateX(${translateX}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    cursor: isUpdating ? 'progress' : 'pointer',
                    touchAction: 'pan-y'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                }}>
                    <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: statusColors.bg,
                        color: statusColors.text
                    }}>
                        {incident.status}
                    </span>
                    {incident.urgency && (
                        <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: '999px',
                            fontSize: '0.6rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background: urgencyColors.bg,
                            color: urgencyColors.text
                        }}>
                            {incident.urgency}
                        </span>
                    )}
                </div>

                {/* Title */}
                <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    lineHeight: '1.3',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {incident.title}
                </div>

                {/* Meta */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)'
                }}>
                    {incident.service?.name && (
                        <>
                            <span>{incident.service.name}</span>
                            <span>•</span>
                        </>
                    )}
                    <span>{timeAgo}</span>
                </div>

                {/* Swipe hint */}
                {incident.status.toLowerCase() === 'open' && (
                    <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        opacity: 0.6,
                        textAlign: 'center',
                        marginTop: '0.25rem'
                    }}>
                        ← Acknowledge • Resolve →
                    </div>
                )}
            </div>

            {isUpdating && (
                <div className="mobile-incident-card-overlay">
                    Updating...
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
