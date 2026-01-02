'use client';

import React, { useState } from 'react';
import MobileCard from '@/components/mobile/MobileCard';

function isIosSafari(userAgent: string) {
    const ua = userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('edgios');
    return isIos && isSafari;
}

export default function PwaInstallCard() {
    const [{ shouldShow, isSafari }] = useState(() => {
        if (typeof window === 'undefined') {
            return { shouldShow: false, isSafari: false };
        }
        const ua = window.navigator.userAgent || '';
        const iosSafari = isIosSafari(ua);
        const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches
            || (window.navigator as { standalone?: boolean }).standalone === true;

        return { shouldShow: iosSafari && !isStandalone, isSafari: iosSafari };
    });

    if (!shouldShow) return null;

    return (
        <MobileCard padding="md">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Install OpsSentinal</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Add the app to your Home Screen for faster access and alerts.
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isSafari
                        ? 'Tap Share, scroll, then choose Add to Home Screen.'
                        : 'Open this page in Safari to see Add to Home Screen.'}
                </div>
            </div>
        </MobileCard>
    );
}
