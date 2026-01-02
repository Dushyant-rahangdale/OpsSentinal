'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MobileBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    snapPoints?: ('content' | 'half' | 'full')[];
    showHandle?: boolean;
}

/**
 * Native-style bottom sheet modal for mobile UI
 * Supports drag-to-dismiss and snap points
 */
export default function MobileBottomSheet({
    isOpen,
    onClose,
    title,
    children,
    snapPoints = ['content'],
    showHandle = true
}: MobileBottomSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [translateY, setTranslateY] = useState(0);
    const startY = useRef(0);
    const currentY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTranslateY(0);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        currentY.current = translateY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const deltaY = e.touches[0].clientY - startY.current;
        const newTranslateY = Math.max(0, currentY.current + deltaY);
        setTranslateY(newTranslateY);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        const sheetHeight = sheetRef.current?.offsetHeight || 0;

        // If dragged more than 30% down, close the sheet
        if (translateY > sheetHeight * 0.3) {
            onClose();
        } else {
            // Snap back to open position
            setTranslateY(0);
        }
    };

    if (!isOpen) return null;

    const getMaxHeight = () => {
        const snap = snapPoints[0];
        switch (snap) {
            case 'half': return '50vh';
            case 'full': return '90vh';
            default: return 'auto';
        }
    };

    return (
        <>
            {/* CSS for animations */}
            <style>{`
                @keyframes slideUpSheet {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes fadeInBackdrop {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .bottom-sheet-content {
                    animation: slideUpSheet 0.3s ease-out forwards;
                }
                .bottom-sheet-backdrop {
                    animation: fadeInBackdrop 0.2s ease-out forwards;
                }
            `}</style>

            {/* Backdrop */}
            <div
                className="bottom-sheet-backdrop"
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    zIndex: 999
                }}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="bottom-sheet-content"
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: getMaxHeight(),
                    background: 'var(--bg-surface)',
                    borderRadius: '24px 24px 0 0',
                    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transform: `translateY(${translateY}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                    paddingBottom: 'env(safe-area-inset-bottom, 0)'
                }}
            >
                {/* Drag Handle */}
                {showHandle && (
                    <div
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{
                            padding: '12px 0 8px',
                            display: 'flex',
                            justifyContent: 'center',
                            cursor: 'grab',
                            touchAction: 'none'
                        }}
                    >
                        <div style={{
                            width: '36px',
                            height: '4px',
                            borderRadius: '2px',
                            background: 'var(--border)'
                        }} />
                    </div>
                )}

                {/* Header */}
                {title && (
                    <div style={{
                        padding: '0 1.25rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <h3 style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            margin: 0
                        }}>
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem 1.25rem',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    {children}
                </div>
            </div>
        </>
    );
}
