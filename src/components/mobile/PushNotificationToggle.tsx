'use client';

import { useState, useEffect } from 'react';
import MobileCard from '@/components/mobile/MobileCard';
import { logger } from '@/lib/logger';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, char => char.charCodeAt(0));
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
  const serviceWorkerPath = '/sw-push.js';

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  async function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }
    const existing = await navigator.serviceWorker.getRegistration();
    const targetUrl = new URL(serviceWorkerPath, window.location.origin).toString();
    const existingUrl = existing?.active?.scriptURL;
    const shouldRegister = !existing || !existingUrl || existingUrl !== targetUrl;
    const registration = shouldRegister
      ? await navigator.serviceWorker.register(serviceWorkerPath, { scope: '/' })
      : existing;
    await navigator.serviceWorker.ready;
    return registration;
  }

  async function checkSubscription() {
    try {
      const registration = await ensureServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error: unknown) {
      logger.error('Failed to check push subscription', {
        component: 'PushNotificationToggle',
        error,
      });
    }
  }

  async function subscribe() {
    setLoading(true);
    setError('');
    try {
      if (Notification.permission === 'denied') {
        throw new Error('Notifications blocked. Please enable in browser settings.');
      }

      // Race condition to prevent infinite hanging
      const registration = (await Promise.race([
        ensureServiceWorker(),
        new Promise<ServiceWorkerRegistration>((_, reject) =>
          setTimeout(
            () => reject(new Error('Service Worker taking too long. Try reloading.')),
            4000
          )
        ),
      ])) as ServiceWorkerRegistration;

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
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });

      // Send to server
      const res = await fetch('/api/user/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) throw new Error('Failed to save subscription');

      setIsSubscribed(true);
      setError('');
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
      const registration = await ensureServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return;
      }

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const response = await fetch('/api/user/push-subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription');
      }
      setIsSubscribed(false);
    } catch (error: unknown) {
      logger.error('Failed to unsubscribe from push notifications', {
        component: 'PushNotificationToggle',
        error,
      });
      setError(
        error instanceof Error ? error.message : 'Failed to unsubscribe from push notifications'
      );
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
          <span
            style={{
              fontSize: '1.25rem',
              width: '24px',
              textAlign: 'center',
              lineHeight: '1.5rem',
            }}
          >
            🔔
          </span>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
              }}
            >
              Push Notifications
            </h3>
            <p
              style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
            >
              Active Incident and page alerts
            </p>
          </div>
        </div>
        {/* Toggle UI */}
        <button
          type="button"
          onClick={loading ? undefined : isSubscribed ? unsubscribe : subscribe}
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
            flexShrink: 0,
          }}
        >
          {loading ? (
            <div
              style={{
                width: '14px',
                height: '14px',
                border: `2px solid ${isSubscribed ? 'var(--badge-error-text)' : 'white'}`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : isSubscribed ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </button>
      </div>
      {error && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--badge-error-text)',
            padding: '0.5rem',
            background: 'var(--badge-error-bg)',
            borderRadius: '4px',
            marginTop: '0.75rem',
          }}
        >
          Error: {error}
        </div>
      )}
      <div
        style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        <button
          type="button"
          onClick={sendTestPush}
          disabled={!isSubscribed || isTesting || loading}
          style={{
            padding: '0.625rem 1rem',
            borderRadius: '8px',
            background:
              isSubscribed && !isTesting && !loading ? 'var(--accent)' : 'var(--bg-secondary)',
            color: isSubscribed && !isTesting && !loading ? 'white' : 'var(--text-tertiary)',
            fontWeight: 600,
            fontSize: '0.85rem',
            border: '1px solid var(--border)',
            cursor: isSubscribed && !isTesting && !loading ? 'pointer' : 'not-allowed',
            opacity: isSubscribed && !isTesting && !loading ? 1 : 0.6,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            minHeight: '40px',
          }}
        >
          {isTesting ? (
            <>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Sending test...
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.1rem' }}>🔔</span>
              Send test push
            </>
          )}
        </button>
        {testMessage && (
          <div
            style={{
              fontSize: '0.75rem',
              color:
                testMessage.includes('successfully') || testMessage.includes('sent')
                  ? 'var(--color-success)'
                  : 'var(--color-error)',
              padding: '0.5rem',
              background:
                testMessage.includes('successfully') || testMessage.includes('sent')
                  ? 'var(--badge-success-bg, #d1fae5)'
                  : 'var(--badge-error-bg)',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            {testMessage}
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </MobileCard>
  );
}
