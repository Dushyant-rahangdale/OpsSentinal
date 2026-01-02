'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ConnectionInfo = {
    effectiveType?: string;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
};

const isSlowConnection = (effectiveType: string | null) => {
    return effectiveType === 'slow-2g' || effectiveType === '2g';
};

export default function MobileNetworkBanner() {
    const router = useRouter();
    const [isOnline, setIsOnline] = useState(true);
    const [effectiveType, setEffectiveType] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateOnline = () => setIsOnline(navigator.onLine);
        const updateConnection = () => {
            const connection = (navigator as unknown as { connection?: ConnectionInfo }).connection;
            setEffectiveType(connection?.effectiveType ?? null);
        };

        updateOnline();
        updateConnection();

        window.addEventListener('online', updateOnline);
        window.addEventListener('offline', updateOnline);

        const connection = (navigator as unknown as { connection?: ConnectionInfo }).connection;
        connection?.addEventListener?.('change', updateConnection);

        return () => {
            window.removeEventListener('online', updateOnline);
            window.removeEventListener('offline', updateOnline);
            connection?.removeEventListener?.('change', updateConnection);
        };
    }, []);

    if (!isOnline) {
        return (
            <div className="mobile-network-banner offline" data-swipe-ignore>
                <span>You&apos;re offline. Some actions may fail.</span>
                <button type="button" onClick={() => router.refresh()}>
                    Retry
                </button>
            </div>
        );
    }

    if (isSlowConnection(effectiveType)) {
        return (
            <div className="mobile-network-banner slow" data-swipe-ignore>
                <span>Slow connection detected. Updates may lag.</span>
                <button type="button" onClick={() => router.refresh()}>
                    Refresh
                </button>
            </div>
        );
    }

    return null;
}
