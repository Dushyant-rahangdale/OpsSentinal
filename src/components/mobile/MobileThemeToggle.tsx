'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import MobileCard from '@/components/mobile/MobileCard';

export default function MobileThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <MobileCard variant="default" padding="md">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '24px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dark Mode</span>
                </div>
            </MobileCard>
        );
    }

    const isDark = theme === 'dark';

    return (
        <div style={{ cursor: 'pointer' }} onClick={() => setTheme(isDark ? 'light' : 'dark')}>
            <MobileCard variant="default" padding="md">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <span style={{ fontSize: '1.25rem', width: '24px', textAlign: 'center' }}>{isDark ? '🌙' : '☀️'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dark Mode</span>
                    </div>

                    {/* Toggle UI */}
                    <div style={{
                        flexShrink: 0,
                        width: '48px',
                        height: '28px',
                        background: isDark ? 'var(--accent)' : 'var(--secondary)',
                        borderRadius: '999px',
                        position: 'relative',
                        transition: 'background 0.2s ease, opacity 0.2s ease',
                        opacity: isDark ? 1 : 0.4
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isDark ? '22px' : '2px',
                            transition: 'left 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                </div>
            </MobileCard>
        </div>
    );
}
