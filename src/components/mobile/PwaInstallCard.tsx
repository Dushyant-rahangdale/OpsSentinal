'use client';

import React, { useState, useEffect } from 'react';
import MobileCard from '@/components/mobile/MobileCard';

function isIosSafari(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari =
    ua.includes('safari') &&
    !ua.includes('crios') &&
    !ua.includes('fxios') &&
    !ua.includes('edgios');
  return isIos && isSafari;
}

export default function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) &&
      ua.includes('safari') &&
      !ua.includes('crios') &&
      !ua.includes('fxios');
    setIsIos(ios);

    // Check if already standalone
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Listen for install prompt on Android/Desktop
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (!mounted || isStandalone) return null;

  // Show if we have an install prompt (Android/Desktop) OR if it's iOS Safari
  const shouldShow = !!deferredPrompt || isIos;

  if (!shouldShow) return null;

  return (
    <MobileCard padding="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Install OpsKnight</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Add the app to your Home Screen for faster access and alerts.
        </div>

        {deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'var(--accent-foreground, white)',
              fontWeight: 500,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Install App
          </button>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Tap <span style={{ fontWeight: 600 }}>Share</span>, scroll down, then tap{' '}
            <span style={{ fontWeight: 600 }}>Add to Home Screen</span>.
          </div>
        )}
      </div>
    </MobileCard>
  );
}
