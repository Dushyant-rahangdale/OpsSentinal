'use client';

import { useState, useEffect } from 'react';
import MobileCard from '@/components/mobile/MobileCard';
import { logger } from '@/lib/logger';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function normalizeVapidKey(rawKey: string) {
    const trimmed = rawKey.trim();
    if (!trimmed) {
        return { error: 'Push notifications not configured (missing VAPID key)' };
    }

    if (trimmed.includes('BEGIN PUBLIC KEY') || trimmed.includes('END PUBLIC KEY')) {
        return { error: 'Invalid VAPID public key. Use the base64url public key, not a PEM block.' };
    }

    let cleaned = trimmed.replace(/^['"]|['"]$/g, '').replace(/\s+/g, '');
    cleaned = cleaned.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

    if (!/^[A-Za-z0-9\-_]+$/.test(cleaned)) {
        return { error: 'Invalid VAPID public key format.' };
    }

    return { key: cleaned };
}

export default function PushNotificationToggle() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testMessage, setTestMessage] = useState('');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    async function checkSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error: unknown) {
            logger.error('Failed to check push subscription', { component: 'PushNotificationToggle', error });
        }
    }

    async function subscribe() {
        setLoading(true);
        setError('');
        try {
            // Race condition to prevent infinite hanging
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<ServiceWorkerRegistration>((_, reject) =>
                    setTimeout(() => reject(new Error('Service Worker taking too long. Try reloading.')), 4000)
                )
            ]);

            // Fetch VAPID Key from API (supports DB or Env)
            const keyRes = await fetch('/api/system/vapid-public-key');
            if (!keyRes.ok) throw new Error('VAPID Configuration missing. Please contact admin.');
            const { key: vapidKey } = await keyRes.json();
            const normalized = normalizeVapidKey(String(vapidKey || ''));
            if (normalized.error || !normalized.key) {
                throw new Error(normalized.error || 'Invalid VAPID public key');
            }

            let applicationServerKey: Uint8Array;
            try {
                applicationServerKey = urlBase64ToUint8Array(normalized.key);
            } catch {
                throw new Error('Invalid VAPID public key format. Generate a new VAPID key pair.');
            }
            if (applicationServerKey.length !== 65) {
                throw new Error('Invalid VAPID public key length. Generate a new VAPID key pair.');
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey as unknown as BufferSource
            });

            // Send to server
            const res = await fetch('/api/user/push-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });

            if (!res.ok) throw new Error('Failed to save subscription');

            setIsSubscribed(true);
        } catch (error: unknown) {
            logger.error('Push subscription failed', { component: 'PushNotificationToggle', error });
            const message = error instanceof Error ? error.message : 'Failed to subscribe';
            setError(message);
            if (Notification.permission === 'denied') {
                setError('Notifications blocked. Please enable in browser settings.');
            }
        } finally {
            setLoading(false);
        }
    }

    async function unsubscribe() {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
            setIsSubscribed(false);
        } catch (error: unknown) {
            logger.error('Failed to unsubscribe from push notifications', { component: 'PushNotificationToggle', error });
        } finally {
            setLoading(false);
        }
    }

    async function sendTestPush() {
        setIsTesting(true);
        setTestMessage('');
        try {
            const response = await fetch('/api/notifications/test-push', { method: 'POST' });
            const data = (await response.json()) as { message?: string; error?: string };
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send test push.');
            }
            setTestMessage(data.message || 'Test push sent. Check your device.');
        } catch (error: unknown) {
            logger.error('Push test failed', { component: 'PushNotificationToggle', error });
            const message = error instanceof Error ? error.message : 'Failed to send test push.';
            setTestMessage(message);
        } finally {
            setIsTesting(false);
        }
    }

    if (!isSupported) return null;

    return (
        <MobileCard padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                    <span style={{ fontSize: '1.25rem', width: '24px', textAlign: 'center', lineHeight: '1.5rem' }}>🔔</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>Push Notifications</h3>
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Active Incident and page alerts
                        </p>
                    </div>
                </div>
                {/* Toggle UI */}
                <button
                    type="button"
                    onClick={loading ? undefined : (isSubscribed ? unsubscribe : subscribe)}
                    disabled={loading}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: isSubscribed ? 'var(--badge-error-bg)' : 'var(--accent)',
                        color: isSubscribed ? 'var(--badge-error-text)' : 'white',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        whiteSpace: 'nowrap',
                        minWidth: '80px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    {loading ? (
                        <div style={{
                            width: '14px', height: '14px',
                            border: `2px solid ${isSubscribed ? 'var(--badge-error-text)' : 'white'}`,
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                    ) : (isSubscribed ? 'Disable' : 'Enable')}
                </button>
            </div>
            {error && (
                <div style={{ fontSize: '0.75rem', color: 'var(--badge-error-text)', padding: '0.5rem', background: 'var(--badge-error-bg)', borderRadius: '4px', marginTop: '0.75rem' }}>
                    Error: {error}
                </div>
            )}
            <div className="mobile-push-test">
                <button
                    type="button"
                    className="mobile-push-test-button"
                    onClick={sendTestPush}
                    disabled={!isSubscribed || isTesting || loading}
                >
                    {isTesting ? 'Sending test...' : 'Send test push'}
                </button>
                {testMessage && (
                    <span className="mobile-push-test-message">{testMessage}</span>
                )}
            </div>
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </MobileCard>
    );
}
