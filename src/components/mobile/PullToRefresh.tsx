'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export default function PullToRefresh({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [startPoint, setStartPoint] = useState<number>(0);
    const [pullChange, setPullChange] = useState<number>(0);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const pullThreshold = 80;

    const initLoading = async () => {
        setRefreshing(true);
        // Trigger Next.js router refresh
        router.refresh();

        // Simulate minimum delay for UX
        setTimeout(() => {
            setRefreshing(false);
            setPullChange(0);
        }, 1000);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        // Find scrollable parent (.mobile-content)
        const scrollParent = containerRef.current?.closest('.mobile-content');
        const scrollTop = scrollParent ? scrollParent.scrollTop : (window.scrollY || document.documentElement.scrollTop);

        // Only enable pull-to-refresh if we are at the very top
        if (scrollTop <= 0) {
            setStartPoint(e.targetTouches[0].clientY);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // Check scroll again just in case
        const scrollParent = containerRef.current?.closest('.mobile-content');
        const scrollTop = scrollParent ? scrollParent.scrollTop : (window.scrollY || document.documentElement.scrollTop);

        if (scrollTop > 0) return;

        if (!startPoint) return;
        const touchY = e.targetTouches[0].clientY;
        const diff = touchY - startPoint;

        // Only allow pulling down, and add resistance (logarithmic/sqrt)
        if (diff > 0) {
            // Prevent default only if we are pulling down to avoid native scroll
            // Note: Preventing default on passive listeners is tricky in React 18+
            // We'll just rely on the UI visual
            setPullChange(diff > 0 ? Math.min(diff * 0.5, 120) : 0);
        }
    };

    const handleTouchEnd = () => {
        if (!startPoint) return;

        if (pullChange > pullThreshold) {
            initLoading();
        } else {
            setPullChange(0);
        }
        setStartPoint(0);
    };

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                minHeight: '100vh',
                position: 'relative'
            }}
        >
            {/* Loading Indicator */}
            <div style={{
                height: pullChange > 0 || refreshing ? '60px' : '0',
                overflow: 'hidden',
                transition: refreshing ? 'height 0.2s ease' : 'none', // No transition on drag
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{
                    transform: `rotate(${pullChange * 2}deg)`,
                    transition: 'transform 0.1s linear',
                    opacity: Math.min(pullChange / pullThreshold, 1)
                }}>
                    {refreshing ? (
                        <div className="ptr-spinner" style={{ animation: 'spin 1s linear infinite' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" />
                            </svg>
                        </div>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" style={{ transform: `rotate(${pullChange > pullThreshold ? 180 : 0}deg)`, transition: 'transform 0.2s' }}>
                            <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            </div>

            <div style={{
                transition: refreshing ? 'transform 0.2s ease' : 'none',
                // transform: `translateY(${refreshing ? 20 : 0}px)`
            }}>
                {children}
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
